/* =========================================================
   WEBGIS DESA HEGARMANAH
   Main JavaScript
========================================================= */


/* =========================================================
   KONFIGURASI
========================================================= */

const CONFIG = {

    // Koordinat awal Desa Hegarmanah
    center: [-6.8334, 107.2714],

    // Zoom awal
    zoom: 14,

    // Folder data GeoJSON
    dataPath: "data/",

    // File GeoJSON
    layers: {

        administrasi: "batas_desa.geojson",

        jalan: "jalan.geojson",

        sungai: "sungai.geojson",

        bangunan: "bangunan.geojson",

        umkm: "umkm.geojson",

        wisata: "wisata.geojson"

    }

};


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let map;

let baseMap;

let layerGroups = {};

let geojsonData = {};

let measurementLayer;


/* =========================================================
   LOADING SYSTEM
========================================================= */

function updateLoading(progress, text) {

    const progressBar =
        document.getElementById(
            "loading-progress"
        );

    const loadingText =
        document.getElementById(
            "loading-text"
        );


    if (progressBar) {

        progressBar.style.width =
            `${progress}%`;

    }


    if (loadingText) {

        loadingText.textContent =
            text;

    }

}


function hideLoading() {

    const screen =
        document.getElementById(
            "loading-screen"
        );


    if (!screen) return;


    screen.classList.add(
        "hidden"
    );

}


/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);


async function initializeApplication() {

    try {

        updateLoading(
            10,
            "Membuat peta..."
        );


        /*
         * PENTING:
         * Peta dibuat TERLEBIH DAHULU.
         *
         * Jadi kalau GeoJSON gagal,
         * peta tetap muncul.
         */

        initializeMap();


        updateLoading(
            35,
            "Memuat layer peta..."
        );


        await loadAllLayers();


        updateLoading(
            75,
            "Mengaktifkan fitur..."
        );


        initializeControls();


        updateLoading(
            90,
            "Mengambil informasi cuaca..."
        );


        /*
         * Cuaca TIDAK boleh membuat
         * peta gagal.
         *
         * Kalau API gagal,
         * aplikasi tetap lanjut.
         */

        loadWeather();


        updateLoading(
            100,
            "WebGIS siap digunakan."
        );


        setTimeout(
            hideLoading,
            500
        );


        setSystemStatus(
            "online",
            "WebGIS aktif"
        );


    }

    catch (error) {

        console.error(
            "Application Error:",
            error
        );


        /*
         * PENTING:
         * Walaupun terjadi error,
         * loading screen tetap ditutup.
         */

        updateLoading(
            100,
            "Peta siap digunakan."
        );


        setTimeout(
            hideLoading,
            500
        );


        setSystemStatus(
            "error",
            "Beberapa data gagal dimuat"
        );

    }

}


/* =========================================================
   INITIALIZE MAP
========================================================= */

function initializeMap() {

    map = L.map(
        "map",
        {

            center:
                CONFIG.center,

            zoom:
                CONFIG.zoom,

            zoomControl:
                false

        }
    );


    /* =====================================================
       OPEN STREET MAP
    ====================================================== */

    baseMap = L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 20,

            attribution:
                '&copy; OpenStreetMap contributors'

        }

    );


    baseMap.addTo(map);


    /* =====================================================
       MEASUREMENT LAYER
    ====================================================== */

    measurementLayer =
        L.featureGroup().addTo(map);


    /* =====================================================
       MAP EVENTS
    ====================================================== */

    map.on(
        "mousemove",
        updateCoordinates
    );


    map.on(
        "click",
        function () {

            console.log(
                "Map clicked"
            );

        }
    );

}


/* =========================================================
   LOAD ALL GEOJSON
========================================================= */

async function loadAllLayers() {

    const layerNames =
        Object.keys(
            CONFIG.layers
        );


    for (
        let i = 0;
        i < layerNames.length;
        i++
    ) {

        const layerName =
            layerNames[i];


        const file =
            CONFIG.layers[
                layerName
            ];


        await loadGeoJSONLayer(
            layerName,
            file
        );


        const progress =
            35 +
            (
                (i + 1) /
                layerNames.length
            ) *
            35;


        updateLoading(
            progress,
            `Memuat ${layerName}...`
        );

    }

}


/* =========================================================
   LOAD GEOJSON
========================================================= */

async function loadGeoJSONLayer(
    layerName,
    filename
) {

    const url =
        CONFIG.dataPath +
        filename;


    try {

        const response =
            await fetch(url);


        /*
         * Kalau file tidak ditemukan,
         * jangan throw error global.
         */

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        geojsonData[
            layerName
        ] = data;


        const layer =
            createGeoJSONLayer(
                layerName,
                data
            );


        layerGroups[
            layerName
        ] = layer;


        updateLayerStatus(
            layerName,
            "Siap"
        );


        return layer;

    }

    catch (error) {

        console.warn(
            `Layer ${layerName} gagal dimuat:`,
            error
        );


        /*
         * Jangan membuat aplikasi berhenti.
         */

        layerGroups[
            layerName
        ] = null;


        updateLayerStatus(
            layerName,
            "Tidak tersedia"
        );

        return null;

    }

}


/* =========================================================
   CREATE GEOJSON LAYER
========================================================= */

function createGeoJSONLayer(
    layerName,
    data
) {

    const layer =
        L.geoJSON(
            data,
            {

                style:
                    function () {

                        return getLayerStyle(
                            layerName
                        );

                    },


                pointToLayer:
                    function (
                        feature,
                        latlng
                    ) {

                        return createPointMarker(
                            layerName,
                            feature,
                            latlng
                        );

                    },


                onEachFeature:
                    function (
                        feature,
                        leafletLayer
                    ) {

                        createPopup(
                            layerName,
                            feature,
                            leafletLayer
                        );

                    }

            }
        );


    return layer;

}


/* =========================================================
   LAYER STYLE
========================================================= */

function getLayerStyle(
    layerName
) {

    const styles = {

        administrasi: {

            color: "#0284c7",

            weight: 3,

            fillOpacity: 0.08

        },


        jalan: {

            color: "#f59e0b",

            weight: 2

        },


        sungai: {

            color: "#0ea5e9",

            weight: 2.5

        },


        bangunan: {

            color: "#64748b",

            weight: 1,

            fillColor: "#94a3b8",

            fillOpacity: .3

        },


        umkm: {

            color: "#f97316",

            weight: 2

        },


        wisata: {

            color: "#22c55e",

            weight: 2

        }

    };


    return styles[
        layerName
    ] || {

        color: "#0ea5e9",

        weight: 2

    };

}


/* =========================================================
   POINT MARKER
========================================================= */

function createPointMarker(
    layerName,
    feature,
    latlng
) {

    let iconColor =
        "#0ea5e9";


    let icon =
        "fa-location-dot";


    if (
        layerName ===
        "umkm"
    ) {

        iconColor =
            "#f97316";

        icon =
            "fa-store";

    }


    if (
        layerName ===
        "wisata"
    ) {

        iconColor =
            "#22c55e";

        icon =
            "fa-tree";

    }


    const markerIcon =
        L.divIcon({

            className:
                "custom-map-marker",

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

            iconSize:
                [32, 32],

            iconAnchor:
                [16, 16]

        });


    return L.marker(
        latlng,
        {
            icon:
                markerIcon
        }
    );

}


/* =========================================================
   POPUP
========================================================= */

function createPopup(
    layerName,
    feature,
    leafletLayer
) {

    const properties =
        feature.properties || {};


    let title =
        properties.nama ||
        properties.NAMA ||
        properties.name ||
        properties.NAME ||
        layerName;


    let content = "";


    Object.entries(
        properties
    )
    .slice(0, 8)
    .forEach(
        function (
            [key, value]
        ) {

            if (
                value !== null &&
                value !== undefined &&
                value !== ""
            ) {

                content += `

                    <div>
                        <b>${key}</b>:
                        ${value}
                    </div>

                `;

            }

        }
    );


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


    leafletLayer.bindPopup(
        html
    );


    /*
     * Klik feature
     * → zoom otomatis
     */

    leafletLayer.on(
        "click",
        function () {

            if (
                leafletLayer.getBounds
            ) {

                try {

                    const bounds =
                        leafletLayer.getBounds();


                    if (
                        bounds.isValid()
                    ) {

                        map.fitBounds(
                            bounds,
                            {
                                maxZoom: 17
                            }
                        );

                    }

                }

                catch (error) {

                    console.log(
                        "Tidak dapat zoom feature."
                    );

                }

            }

        }
    );

}


/* =========================================================
   LAYER STATUS
========================================================= */

function updateLayerStatus(
    layerName,
    status
) {

    const element =
        document.getElementById(
            `${layerName}-status`
        );


    if (!element) return;


    element.textContent =
        status;


    if (
        status === "Siap"
    ) {

        element.style.color =
            "#16a34a";

    }

}


/* =========================================================
   CONTROLS
========================================================= */

function initializeControls() {


    /* =====================================================
       LAYER CHECKBOX
    ====================================================== */

    Object.keys(
        CONFIG.layers
    )
    .forEach(
        function (
            layerName
        ) {

            const checkbox =
                document.getElementById(
                    `${layerName}-layer`
                );


            if (!checkbox)
                return;


            checkbox.addEventListener(
                "change",
                function () {

                    const layer =
                        layerGroups[
                            layerName
                        ];


                    if (!layer)
                        return;


                    if (
                        this.checked
                    ) {

                        layer.addTo(
                            map
                        );

                    }

                    else {

                        map.removeLayer(
                            layer
                        );

                    }

                }
            );

        }
    );


    /* =====================================================
       OPACITY
    ====================================================== */

    const slider =
        document.getElementById(
            "opacity-slider"
        );


    slider.addEventListener(
        "input",
        function () {

            const value =
                this.value;


            document.getElementById(
                "opacity-value"
            ).textContent =
                `${value}%`;


            const layer =
                layerGroups[
                    "administrasi"
                ];


            if (
                layer &&
                layer.setStyle
            ) {

                layer.setStyle({

                    opacity:
                        value / 100,

                    fillOpacity:
                        0.08 *
                        (
                            value / 100
                        )

                });

            }

        }
    );


    /* =====================================================
       ZOOM
    ====================================================== */

    document
        .getElementById(
            "zoom-in"
        )
        .onclick =
        () => map.zoomIn();


    document
        .getElementById(
            "zoom-out"
        )
        .onclick =
        () => map.zoomOut();


    document
        .getElementById(
            "reset-map"
        )
        .onclick =
        () => {

            map.setView(
                CONFIG.center,
                CONFIG.zoom
            );

        };


    /* =====================================================
       LOCATION
    ====================================================== */

    document
        .getElementById(
            "location-button"
        )
        .onclick =
        locateUser;


    /* =====================================================
       FULLSCREEN
    ====================================================== */

    document
        .getElementById(
            "fullscreen-button"
        )
        .onclick =
        toggleFullscreen;


    /* =====================================================
       SEARCH
    ====================================================== */

    document
        .getElementById(
            "search-button"
        )
        .onclick =
        searchLocation;


    document
        .getElementById(
            "search-input"
        )
        .addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchLocation();

                }

            }
        );


    /* =====================================================
       MEASUREMENT
    ====================================================== */

    document
        .getElementById(
            "clear-measure"
        )
        .onclick =
        clearMeasurement;


    /*
     * Untuk tahap pertama,
     * tombol measurement belum
     * menggunakan library tambahan.
     *
     * Kita aktifkan pada fase berikutnya.
     */

    document
        .getElementById(
            "measure-distance"
        )
        .onclick =
        () => {

            alert(
                "Fitur pengukuran jarak akan kita aktifkan pada tahap berikutnya."
            );

        };


    document
        .getElementById(
            "measure-area"
        )
        .onclick =
        () => {

            alert(
                "Fitur pengukuran luas akan kita aktifkan pada tahap berikutnya."
            );

        };

}


/* =========================================================
   SEARCH
========================================================= */

function searchLocation() {

    const input =
        document.getElementById(
            "search-input"
        );


    const query =
        input.value
            .trim()
            .toLowerCase();


    const resultBox =
        document.getElementById(
            "search-results"
        );


    resultBox.innerHTML =
        "";


    if (!query) {

        resultBox.style.display =
            "none";

        return;

    }


    let found = false;


    Object.entries(
        geojsonData
    )
    .forEach(
        function (
            [layerName, data]
        ) {

            if (
                !data ||
                !data.features
            )
                return;


            data.features.forEach(
                function (
                    feature
                ) {

                    const properties =
                        feature.properties ||
                        {};


                    const text =
                        JSON.stringify(
                            properties
                        )
                        .toLowerCase();


                    if (
                        text.includes(
                            query
                        )
                    ) {

                        found = true;


                        const result =
                            document.createElement(
                                "div"
                            );


                        result.className =
                            "search-result";


                        result.innerHTML = `

                            <strong>
                                ${layerName}
                            </strong>

                            <br>

                            <small>
                                Hasil pencarian ditemukan
                            </small>

                        `;


                        result.onclick =
                            function () {

                                const layer =
                                    layerGroups[
                                        layerName
                                    ];


                                if (!layer)
                                    return;


                                layer.eachLayer(
                                    function (
                                        leafletLayer
                                    ) {

                                        if (
                                            leafletLayer.feature ===
                                            feature
                                        ) {

                                            try {

                                                const bounds =
                                                    leafletLayer.getBounds();


                                                map.fitBounds(
                                                    bounds,
                                                    {
                                                        maxZoom: 18
                                                    }
                                                );

                                            }
                                            catch (error) {}

                                            leafletLayer.openPopup();

                                        }

                                    }
                                );

                            };


                        resultBox.appendChild(
                            result
                        );

                    }

                }
            );

        }
    );


    if (!found) {

        resultBox.innerHTML = `

            <div class="search-result">

                Lokasi tidak ditemukan.

            </div>

        `;

    }


    resultBox.style.display =
        "block";

}


/* =========================================================
   LOCATION
========================================================= */

function locateUser() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "Browser tidak mendukung GPS."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        function (
            position
        ) {

            const lat =
                position.coords.latitude;


            const lng =
                position.coords.longitude;


            map.setView(
                [lat, lng],
                17
            );


            L.marker(
                [lat, lng]
            )
            .addTo(map)
            .bindPopup(
                "Lokasi Anda"
            )
            .openPopup();

        },


        function () {

            alert(
                "Lokasi tidak dapat diperoleh. Pastikan GPS/browser diizinkan."
            );

        }

    );

}


/* =========================================================
   FULLSCREEN
========================================================= */

function toggleFullscreen() {

    const element =
        document.documentElement;


    if (
        !document.fullscreenElement
    ) {

        element.requestFullscreen();

    }

    else {

        document.exitFullscreen();

    }

}


/* =========================================================
   COORDINATE
========================================================= */

function updateCoordinates(
    event
) {

    const display =
        document.getElementById(
            "coordinate-display"
        );


    display.textContent =

        `Lat: ${event.latlng.lat.toFixed(6)}
         |
         Lng: ${event.latlng.lng.toFixed(6)}`;

}


/* =========================================================
   WEATHER
========================================================= */

async function loadWeather() {

    /*
     * API cuaca kita pisahkan dari
     * proses pembuatan peta.
     *
     * Jadi API error tidak akan
     * membuat WebGIS stuck.
     */

    try {

        /*
         * Open-Meteo
         *
         * Tidak membutuhkan API key
         * untuk penggunaan umum.
         */

        const lat =
            CONFIG.center[0];


        const lng =
            CONFIG.center[1];


        const url =

            "https://api.open-meteo.com/v1/forecast" +

            `?latitude=${lat}` +

            `&longitude=${lng}` +

            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code";


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Weather API error"
            );

        }


        const data =
            await response.json();


        const current =
            data.current;


        document.getElementById(
            "weather-temperature"
        ).textContent =
            Math.round(
                current.temperature_2m
            );


        document.getElementById(
            "weather-humidity"
        ).textContent =
            Math.round(
                current.relative_humidity_2m
            );


        document.getElementById(
            "weather-wind"
        ).textContent =
            Math.round(
                current.wind_speed_10m
            );


        document.getElementById(
            "weather-description"
        ).textContent =
            weatherCodeToText(
                current.weather_code
            );


        document.getElementById(
            "weather-icon"
        ).textContent =
            weatherCodeToEmoji(
                current.weather_code
            );


        document.querySelector(
            ".weather-loading"
        ).style.display =
            "none";


        document.getElementById(
            "weather-content"
        ).style.display =
            "block";

    }

    catch (error) {

        console.warn(
            "Cuaca gagal dimuat:",
            error
        );


        document.querySelector(
            ".weather-loading"
        ).textContent =
            "Data cuaca sementara tidak tersedia.";

    }

}


/* =========================================================
   WEATHER CODE
========================================================= */

function weatherCodeToText(
    code
) {

    if (code === 0)
        return "Cerah";


    if (
        code >= 1 &&
        code <= 3
    )
        return "Berawan";


    if (
        code >= 45 &&
        code <= 48
    )
        return "Berkabut";


    if (
        code >= 51 &&
        code <= 67
    )
        return "Hujan ringan";


    if (
        code >= 71 &&
        code <= 77
    )
        return "Salju";


    if (
        code >= 80 &&
        code <= 82
    )
        return "Hujan";


    if (
        code >= 95
    )
        return "Badai";


    return "Tidak diketahui";

}


function weatherCodeToEmoji(
    code
) {

    if (code === 0)
        return "☀️";


    if (
        code >= 1 &&
        code <= 3
    )
        return "🌤️";


    if (
        code >= 45 &&
        code <= 48
    )
        return "🌫️";


    if (
        code >= 51 &&
        code <= 82
    )
        return "🌧️";


    if (
        code >= 95
    )
        return "⛈️";


    return "🌤️";

}


/* =========================================================
   CLEAR MEASUREMENT
========================================================= */

function clearMeasurement() {

    if (
        measurementLayer
    ) {

        measurementLayer.clearLayers();

    }

}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function setSystemStatus(
    status,
    text
) {

    const indicator =
        document.getElementById(
            "system-indicator"
        );


    const textElement =
        document.getElementById(
            "system-text"
        );


    indicator.className =
        "status-dot";


    if (
        status ===
        "online"
    ) {

        indicator.classList.add(
            "online"
        );

    }


    if (
        status ===
        "error"
    ) {

        indicator.classList.add(
            "error"
        );

    }


    textElement.textContent =
        text;

}


/* =========================================================
   FAILSAFE
========================================================= */

/*
 * Jika ada error fatal yang tidak
 * tertangkap, loading screen tetap
 * ditutup maksimal 8 detik.
 */

setTimeout(
    function () {

        const screen =
            document.getElementById(
                "loading-screen"
            );


        if (
            screen &&
            !screen.classList.contains(
                "hidden"
            )
        ) {

            console.warn(
                "Failsafe: loading screen ditutup."
            );


            hideLoading();


            setSystemStatus(
                "error",
                "Peta aktif, sebagian data mungkin belum tersedia."
            );

        }

    },
    8000
);