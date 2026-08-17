import '../css/style.css';
import { updateLoading, hideLoading, setSystemStatus, loadWeather } from "./ui.js";
import { initializeMap, loadAllLayers, initializeControls } from "./map.js";

async function initializeApplication() {
  try {
    updateLoading(10, "Membuat peta...");
    initializeMap();

    updateLoading(35, "Memuat layer peta...");
    await loadAllLayers();

    updateLoading(75, "Mengaktifkan fitur...");
    initializeControls();

    updateLoading(90, "Mengambil informasi cuaca...");
    loadWeather();

    updateLoading(100, "WebGIS siap digunakan.");
    setTimeout(hideLoading, 500);
    setSystemStatus("online", "WebGIS aktif");
  } catch (error) {
    console.error("Application Error:", error);
    updateLoading(100, "Peta siap digunakan.");
    setTimeout(hideLoading, 500);
    setSystemStatus("error", "Beberapa data gagal dimuat");
  }
}

// Event Listener Utama
document.addEventListener("DOMContentLoaded", initializeApplication);

// Failsafe Timeout
setTimeout(function () {
  const screen = document.getElementById("loading-screen");
  if (screen && !screen.classList.contains("hidden")) {
    console.warn("Failsafe: loading screen ditutup.");
    hideLoading();
    setSystemStatus("error", "Peta aktif, sebagian data mungkin belum tersedia.");
  }
}, 8000);
