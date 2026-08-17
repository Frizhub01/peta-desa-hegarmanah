import { CONFIG, state } from "./config.js";
import { updateLoading } from "./ui.js";

export function initializeMap() {
  state.map = L.map("map", {
    center: CONFIG.center,
    zoom: CONFIG.zoom,
    maxZoom: 19,
    zoomControl: false,
  });

  // Definisikan Base Layers
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });

  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 20,
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  });

  const terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  });

  // Set default base map
  osm.addTo(state.map);
  state.baseMap = osm;

  // Simpan base layers untuk kontrol
  state.baseLayers = {
    Jalan: osm,
    Satelit: satellite,
    Medan: terrain,
  };

  // Layer khusus untuk hasil pengukuran
  state.measurementLayer = L.featureGroup().addTo(state.map);

  state.map.on("mousemove", updateCoordinates);

  state.map.on("click", function () {
    console.log("Map clicked");
  });
}

export async function loadAllLayers() {
  const layerNames = Object.keys(CONFIG.layers);
  let adminBounds = null;

  for (let i = 0; i < layerNames.length; i++) {
    const layerName = layerNames[i];
    const file = CONFIG.layers[layerName];

    const layer = await loadGeoJSONLayer(layerName, file);

    // Jika layer administrasi berhasil dimuat
    if (layerName === "administrasi" && layer) {
      adminBounds = layer.getBounds().pad(0.1);

      console.log("Batas administrasi (setelah padding):", adminBounds.toBBoxString());
    }

    const progress = 35 + ((i + 1) / layerNames.length) * 35;

    updateLoading(progress, `Memuat ${layerName}...`);
  }

  // Layer control
  const overlayMaps = Object.fromEntries(Object.entries(state.layerGroups).filter(([_, layer]) => layer !== null));

  state.layerControl = L.control
    .layers(state.baseLayers, overlayMaps, {
      position: "topright",
    })
    .addTo(state.map);

  console.log("Kontrol layer telah ditambahkan ke peta.");

  // Terapkan batas administrasi
  if (adminBounds) {
    state.map.setMaxBounds(adminBounds);
    state.map.fitBounds(adminBounds);

    state.map.setMinZoom(state.map.getBoundsZoom(adminBounds, false));

    console.log("Batas peta telah diterapkan dan tampilan disesuaikan.");
  } else {
    console.warn("Batas administrasi tidak ditemukan, setMaxBounds tidak diterapkan.");
  }
}

async function loadGeoJSONLayer(layerName, filename) {
  const url = CONFIG.dataPath + filename;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Simpan data GeoJSON
    state.geojsonData[layerName] = data;

    const layer = createGeoJSONLayer(layerName, data);

    state.layerGroups[layerName] = layer;

    updateLayerStatus(layerName, "Siap");

    return layer;
  } catch (error) {
    console.warn(`Layer ${layerName} gagal dimuat:`, error);

    state.layerGroups[layerName] = null;

    updateLayerStatus(layerName, "Tidak tersedia");

    return null;
  }
}

function createGeoJSONLayer(layerName, data) {
  return L.geoJSON(data, {
    style: () => getLayerStyle(layerName),

    pointToLayer: (feature, latlng) => createPointMarker(layerName, feature, latlng),

    onEachFeature: (feature, leafletLayer) => createPopup(layerName, feature, leafletLayer),
  });
}

// =========================================================
// MAP UTILITIES
// =========================================================

function getLayerStyle(layerName) {
  const styles = {
    administrasi: {
      color: "#0284c7",
      weight: 3,
      fillOpacity: 0.08,
    },

    jalan: {
      color: "#f59e0b",
      weight: 2,
    },

    sungai: {
      color: "#0ea5e9",
      weight: 2.5,
    },

    bangunan: {
      color: "#64748b",
      weight: 1,
      fillColor: "#94a3b8",
      fillOpacity: 0.3,
    },

    umkm: {
      color: "#f97316",
      weight: 2,
    },

    wisata: {
      color: "#22c55e",
      weight: 2,
    },
  };

  return (
    styles[layerName] || {
      color: "#0ea5e9",
      weight: 2,
    }
  );
}

function createPointMarker(layerName, feature, latlng) {
  let iconColor = "#0ea5e9";
  let icon = "fa-location-dot";

  if (layerName === "umkm") {
    iconColor = "#f97316";
    icon = "fa-store";
  }

  if (layerName === "wisata") {
    iconColor = "#22c55e";
    icon = "fa-tree";
  }

  const markerIcon = L.divIcon({
    className: "custom-map-marker",

    html: `
      <div
        style="
          width:32px;
          height:32px;
          border-radius:50%;
          background:${iconColor};
          border:3px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,.3);
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:13px;
        "
      >
        <i class="fa-solid ${icon}"></i>
      </div>
    `,

    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return L.marker(latlng, {
    icon: markerIcon,
  });
}

function createPopup(layerName, feature, leafletLayer) {
  const properties = feature.properties || {};

  let title = properties.nama || properties.NAMA || properties.name || properties.NAME || layerName;

  let content = "";

  Object.entries(properties)
    .slice(0, 8)
    .forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        content += `
          <div>
            <b>${key}</b>: ${value}
          </div>
        `;
      }
    });

  const html = `
    <div>
      <div class="popup-title">
        ${title}
      </div>

      <div class="popup-type">
        ${layerName}
      </div>

      <div class="popup-content">
        ${content}
      </div>
    </div>
  `;

  leafletLayer.bindPopup(html);

  leafletLayer.on("click", () => {
    if (leafletLayer.getBounds) {
      try {
        const bounds = leafletLayer.getBounds();

        if (bounds.isValid()) {
          state.map.fitBounds(bounds, {
            maxZoom: 17,
          });
        }
      } catch (error) {
        console.log("Tidak dapat zoom feature.");
      }
    }
  });
}

function updateLayerStatus(layerName, status) {
  const element = document.getElementById(`${layerName}-status`);

  if (!element) return;

  element.textContent = status;

  if (status === "Siap") {
    element.style.color = "#16a34a";
  }
}

// =========================================================
// UI CONTROLS
// =========================================================

export function initializeControls() {
  Object.keys(CONFIG.layers).forEach((layerName) => {
    const checkbox = document.getElementById(`${layerName}-layer`);

    if (!checkbox) return;

    checkbox.addEventListener("change", function () {
      const layer = state.layerGroups[layerName];

      if (!layer) return;

      if (this.checked) {
        layer.addTo(state.map);
      } else {
        state.map.removeLayer(layer);
      }
    });
  });

  // Opacity
  const slider = document.getElementById("opacity-slider");

  if (slider) {
    slider.addEventListener("input", function () {
      const value = this.value;

      const opacityValue = document.getElementById("opacity-value");

      if (opacityValue) {
        opacityValue.textContent = `${value}%`;
      }

      const layer = state.layerGroups["administrasi"];

      if (layer && layer.setStyle) {
        layer.setStyle({
          opacity: value / 100,

          fillOpacity: 0.08 * (value / 100),
        });
      }
    });
  }

  // Zoom
  const zoomIn = document.getElementById("zoom-in");

  if (zoomIn) {
    zoomIn.onclick = () => state.map.zoomIn();
  }

  const zoomOut = document.getElementById("zoom-out");

  if (zoomOut) {
    zoomOut.onclick = () => state.map.zoomOut();
  }

  // Reset
  const resetMap = document.getElementById("reset-map");

  if (resetMap) {
    resetMap.onclick = () => state.map.setView(CONFIG.center, CONFIG.zoom);
  }

  // Location
  const locationButton = document.getElementById("location-button");

  if (locationButton) {
    locationButton.onclick = locateUser;
  }

  // Fullscreen
  const fullscreenButton = document.getElementById("fullscreen-button");

  if (fullscreenButton) {
    fullscreenButton.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };
  }

  // Search
  const searchButton = document.getElementById("search-button");

  if (searchButton) {
    searchButton.onclick = searchLocation;
  }

  const searchInput = document.getElementById("search-input");

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        searchLocation();
      }
    });
  }

  // =====================================================
  // MEASUREMENT
  // =====================================================

  const clearMeasure = document.getElementById("clear-measure");

  if (clearMeasure) {
    clearMeasure.onclick = clearMeasurement;
  }

  const measureDistance = document.getElementById("measure-distance");

  if (measureDistance) {
    measureDistance.onclick = () => startMeasurement("distance");
  }

  const measureArea = document.getElementById("measure-area");

  if (measureArea) {
    measureArea.onclick = () => startMeasurement("area");
  }

  initializeMeasurementTools();
}

// =========================================================
// MEASUREMENT VARIABLES
// =========================================================

let measurementMode = null;

let measurementPoints = [];

let measurementPreview = null;

let measurementFinishHandler = null;

let measurementMouseMoveHandler = null;

// =========================================================
// INITIALIZE MEASUREMENT
// =========================================================

function initializeMeasurementTools() {
  const distanceButton = document.getElementById("measure-distance");

  const areaButton = document.getElementById("measure-area");

  const clearButton = document.getElementById("clear-measure");

  [distanceButton, areaButton, clearButton].forEach((button) => {
    if (!button) return;

    button.setAttribute("type", "button");
  });

  // Buat panel informasi
  // jika belum tersedia.
  if (!document.getElementById("measurement-info")) {
    const info = document.createElement("div");

    info.id = "measurement-info";

    info.className = "measurement-info";

    info.setAttribute("aria-live", "polite");

    info.hidden = true;

    document.querySelector(".map-container")?.appendChild(info);
  }
}

// =========================================================
// START MEASUREMENT
// =========================================================

function startMeasurement(mode) {
  if (!state.map || !state.measurementLayer) {
    return;
  }

  clearMeasurement();

  measurementMode = mode;

  measurementPoints = [];

  const mapContainer = state.map.getContainer();

  mapContainer.classList.add("measurement-active");

  mapContainer.classList.toggle("measurement-distance", mode === "distance");

  mapContainer.classList.toggle("measurement-area", mode === "area");

  const distanceButton = document.getElementById("measure-distance");

  const areaButton = document.getElementById("measure-area");

  if (distanceButton) {
    distanceButton.classList.toggle("active", mode === "distance");
  }

  if (areaButton) {
    areaButton.classList.toggle("active", mode === "area");
  }

  if (mode === "distance") {
    updateMeasurementInfo("Mode jarak aktif — klik titik pertama, lalu klik titik berikutnya. Double-click untuk selesai.");
  } else {
    updateMeasurementInfo("Mode luas aktif — klik minimal 3 titik untuk membentuk area. Double-click untuk selesai.");
  }

  // Double click digunakan
  // untuk menyelesaikan pengukuran.
  state.map.doubleClickZoom.disable();

  measurementFinishHandler = () => finishMeasurement();

  measurementMouseMoveHandler = handleMeasurementMouseMove;

  state.map.on("click", handleMeasurementClick);

  state.map.on("dblclick", measurementFinishHandler);

  state.map.on("mousemove", measurementMouseMoveHandler);
}

// =========================================================
// CLICK POINT
// =========================================================

function handleMeasurementClick(event) {
  if (!measurementMode) return;

  measurementPoints.push(event.latlng);

  drawMeasurement();

  const pointCount = measurementPoints.length;

  if (measurementMode === "distance") {
    updateMeasurementInfo(pointCount === 1 ? "Titik pertama tersimpan — klik titik berikutnya." : `Total jarak: ${formatDistance(calculateTotalDistance(measurementPoints))} — double-click untuk selesai.`);
  } else {
    updateMeasurementInfo(pointCount < 3 ? `Titik ${pointCount} tersimpan — tambahkan minimal ${3 - pointCount} titik lagi.` : `Luas sementara: ${formatArea(calculatePolygonArea(measurementPoints))} — double-click untuk selesai.`);
  }
}

// =========================================================
// MOUSE MOVE PREVIEW
// =========================================================

function handleMeasurementMouseMove(event) {
  if (!measurementMode || measurementPoints.length === 0) {
    return;
  }

  const points = [...measurementPoints, event.latlng];

  if (measurementMode === "distance") {
    drawMeasurementPreview(points);

    const distance = calculateTotalDistance(points);

    updateMeasurementInfo(`Jarak sementara: ${formatDistance(distance)}`);
  }

  if (measurementMode === "area" && measurementPoints.length >= 2) {
    drawMeasurementPreview(points);

    updateMeasurementInfo(`Luas sementara: ${formatArea(calculatePolygonArea(points))}`);
  }
}

// =========================================================
// FINISH MEASUREMENT
// =========================================================

function finishMeasurement() {
  if (!measurementMode) return;

  // JARAK
  if (measurementMode === "distance") {
    if (measurementPoints.length < 2) {
      updateMeasurementInfo("Jarak belum dihitung — tandai minimal 2 titik.");

      return;
    }

    const distance = calculateTotalDistance(measurementPoints);

    drawMeasurement(false);

    addResultLabel(measurementPoints[measurementPoints.length - 1], `Jarak: ${formatDistance(distance)}`);

    updateMeasurementInfo(`Pengukuran jarak selesai: ${formatDistance(distance)}.`);
  }

  // LUAS
  else if (measurementMode === "area") {
    if (measurementPoints.length < 3) {
      updateMeasurementInfo("Luas belum dihitung — tandai minimal 3 titik.");

      return;
    }

    const area = calculatePolygonArea(measurementPoints);

    drawMeasurement(false);

    addResultLabel(measurementPoints[measurementPoints.length - 1], `Luas: ${formatArea(area)}`);

    updateMeasurementInfo(`Pengukuran luas selesai: ${formatArea(area)}.`);
  }

  stopMeasurementMode();
}

// =========================================================
// STOP MEASUREMENT MODE
// =========================================================

function stopMeasurementMode() {
  if (!state.map) return;

  state.map.off("click", handleMeasurementClick);

  if (measurementFinishHandler) {
    state.map.off("dblclick", measurementFinishHandler);
  }

  if (measurementMouseMoveHandler) {
    state.map.off("mousemove", measurementMouseMoveHandler);
  }

  state.map.doubleClickZoom.enable();

  state.map.getContainer().classList.remove("measurement-active", "measurement-distance", "measurement-area");

  document.getElementById("measure-distance")?.classList.remove("active");

  document.getElementById("measure-area")?.classList.remove("active");

  measurementMode = null;

  measurementFinishHandler = null;

  measurementMouseMoveHandler = null;

  measurementPreview = null;
}

// =========================================================
// CLEAR MEASUREMENT
// =========================================================

function clearMeasurement() {
  if (!state.map || !state.measurementLayer) {
    return;
  }

  stopMeasurementMode();

  state.measurementLayer.clearLayers();

  measurementPoints = [];

  const info = document.getElementById("measurement-info");

  if (info) {
    info.hidden = true;
    info.textContent = "";
  }
}

// =========================================================
// DRAW MEASUREMENT
// =========================================================

function drawMeasurement(includePreview = true) {
  if (!state.measurementLayer || measurementPoints.length === 0) {
    return;
  }

  state.measurementLayer.clearLayers();

  // Titik pengukuran
  const pointLayer = L.featureGroup();

  measurementPoints.forEach((point) => {
    L.circleMarker(point, {
      radius: 5,
      color: "#ffffff",
      weight: 2,
      fillColor: "#0284c7",
      fillOpacity: 1,
    }).addTo(pointLayer);
  });

  pointLayer.addTo(state.measurementLayer);

  // JARAK
  if (measurementMode === "distance" && measurementPoints.length >= 2) {
    L.polyline(measurementPoints, {
      color: "#0284c7",
      weight: 4,
      opacity: 0.9,
      lineJoin: "round",
    }).addTo(state.measurementLayer);

    addSegmentLabels(measurementPoints);
  }

  // LUAS
  if (measurementMode === "area" && measurementPoints.length >= 2) {
    if (measurementPoints.length >= 3) {
      L.polygon(measurementPoints, {
        color: "#0284c7",
        weight: 3,
        fillColor: "#0ea5e9",
        fillOpacity: 0.15,
      }).addTo(state.measurementLayer);
    } else {
      L.polyline(measurementPoints, {
        color: "#0284c7",
        weight: 3,
        dashArray: "7 6",
      }).addTo(state.measurementLayer);
    }
  }

  if (includePreview) {
    measurementPreview = null;
  }
}

// =========================================================
// DRAW PREVIEW
// =========================================================

function drawMeasurementPreview(points) {
  if (!state.measurementLayer || points.length < 2) {
    return;
  }

  drawMeasurement(false);

  if (measurementMode === "distance") {
    measurementPreview = L.polyline(points, {
      color: "#0284c7",
      weight: 3,
      opacity: 0.55,
      dashArray: "6 7",
    }).addTo(state.measurementLayer);
  }

  if (measurementMode === "area") {
    if (points.length >= 3) {
      measurementPreview = L.polygon(points, {
        color: "#0284c7",
        weight: 2,
        dashArray: "6 7",
        fillColor: "#0ea5e9",
        fillOpacity: 0.08,
      }).addTo(state.measurementLayer);
    } else {
      measurementPreview = L.polyline(points, {
        color: "#0284c7",
        weight: 2,
        dashArray: "6 7",
      }).addTo(state.measurementLayer);
    }
  }
}

// =========================================================
// SEGMENT LABEL
// =========================================================

function addSegmentLabels(points) {
  for (let i = 1; i < points.length; i++) {
    const segmentDistance = state.map.distance(points[i - 1], points[i]);

    const middle = L.latLng(
      (points[i - 1].lat + points[i].lat) / 2,

      (points[i - 1].lng + points[i].lng) / 2,
    );

    L.marker(middle, {
      interactive: false,

      icon: L.divIcon({
        className: "measurement-label-wrapper",

        html: `
          <span class="measurement-label">
            ${formatDistance(segmentDistance)}
          </span>
        `,

        iconSize: null,
      }),
    }).addTo(state.measurementLayer);
  }
}

// =========================================================
// RESULT LABEL
// =========================================================

function addResultLabel(latlng, text) {
  L.marker(latlng, {
    interactive: false,

    icon: L.divIcon({
      className: "measurement-result-wrapper",

      html: `
        <div class="measurement-result">
          ${text}
        </div>
      `,

      iconSize: null,

      iconAnchor: [0, 0],
    }),
  }).addTo(state.measurementLayer);
}

// =========================================================
// CALCULATE DISTANCE
// =========================================================

function calculateTotalDistance(points) {
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += state.map.distance(points[i - 1], points[i]);
  }

  return total;
}

// =========================================================
// CALCULATE AREA
// =========================================================

function calculatePolygonArea(points) {
  if (points.length < 3) {
    return 0;
  }

  const radius = 6378137;

  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];

    const next = points[(i + 1) % points.length];

    const lat1 = (current.lat * Math.PI) / 180;

    const lat2 = (next.lat * Math.PI) / 180;

    const lng1 = (current.lng * Math.PI) / 180;

    const lng2 = (next.lng * Math.PI) / 180;

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs((area * radius * radius) / 2);
}

// =========================================================
// FORMAT DISTANCE
// =========================================================

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "0 m";
  }

  if (meters < 1000) {
    return `${meters.toFixed(2)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
}

// =========================================================
// FORMAT AREA
// =========================================================

function formatArea(squareMeters) {
  if (!Number.isFinite(squareMeters)) {
    return "0 m²";
  }

  if (squareMeters < 10000) {
    return `${squareMeters.toFixed(2)} m²`;
  }

  const hectares = squareMeters / 10000;

  if (squareMeters < 1000000) {
    return `${hectares.toFixed(2)} ha`;
  }

  return `${(squareMeters / 1000000).toFixed(2)} km² (${hectares.toFixed(2)} ha)`;
}

// =========================================================
// MEASUREMENT INFORMATION
// =========================================================

function updateMeasurementInfo(message) {
  const info = document.getElementById("measurement-info");

  if (!info) return;

  info.hidden = false;

  info.textContent = message;
}

// =========================================================
// COORDINATES
// =========================================================

function updateCoordinates(event) {
  document.getElementById("coordinate-display").textContent = `Lat: ${event.latlng.lat.toFixed(6)} | Lng: ${event.latlng.lng.toFixed(6)}`;
}

// =========================================================
// SEARCH
// =========================================================

function searchLocation() {
  const input = document.getElementById("search-input");

  const query = input.value.trim().toLowerCase();

  const resultBox = document.getElementById("search-results");

  resultBox.innerHTML = "";

  if (!query) {
    resultBox.style.display = "none";

    return;
  }

  let found = false;

  Object.entries(state.geojsonData).forEach(([layerName, data]) => {
    if (!data || !data.features) {
      return;
    }

    data.features.forEach((feature) => {
      const properties = feature.properties || {};

      const text = JSON.stringify(properties).toLowerCase();

      if (text.includes(query)) {
        found = true;

        const result = document.createElement("div");

        result.className = "search-result";

        result.innerHTML = `
              <strong>
                ${layerName}
              </strong>
              <br>
              <small>
                Hasil pencarian ditemukan
              </small>
            `;

        result.onclick = () => {
          const layer = state.layerGroups[layerName];

          if (!layer) return;

          layer.eachLayer((leafletLayer) => {
            if (leafletLayer.feature === feature) {
              try {
                const bounds = leafletLayer.getBounds();

                state.map.fitBounds(bounds, {
                  maxZoom: 18,
                });
              } catch (e) {}

              leafletLayer.openPopup();
            }
          });
        };

        resultBox.appendChild(result);
      }
    });
  });

  if (!found) {
    resultBox.innerHTML = `
      <div class="search-result">
        Lokasi tidak ditemukan.
      </div>
    `;
  }

  resultBox.style.display = "block";
}

// =========================================================
// LOCATE USER
// =========================================================

function locateUser() {
  if (!navigator.geolocation) {
    return alert("Browser tidak mendukung GPS.");
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;

      const lng = position.coords.longitude;

      state.map.setView([lat, lng], 17);

      L.marker([lat, lng]).addTo(state.map).bindPopup("Lokasi Anda").openPopup();
    },

    () => alert("Lokasi tidak dapat diperoleh. Pastikan GPS/browser diizinkan."),
  );
}
