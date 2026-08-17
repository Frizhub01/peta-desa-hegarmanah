import { CONFIG } from "./config.js";

export function updateLoading(progress, text) {
  const progressBar = document.getElementById("loading-progress");
  const loadingText = document.getElementById("loading-text");
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (loadingText) loadingText.textContent = text;
}

export function hideLoading() {
  const screen = document.getElementById("loading-screen");
  if (!screen) return;
  screen.classList.add("hidden");
}

export function setSystemStatus(status, text) {
  const indicator = document.getElementById("system-indicator");
  const textElement = document.getElementById("system-text");
  indicator.className = "status-dot";
  if (status === "online") indicator.classList.add("online");
  if (status === "error") indicator.classList.add("error");
  textElement.textContent = text;
}

export async function loadWeather() {
  try {
    const lat = CONFIG.center[0];
    const lng = CONFIG.center[1];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API error");
    const data = await response.json();
    const current = data.current;

    document.getElementById("weather-temperature").textContent = Math.round(current.temperature_2m);
    document.getElementById("weather-humidity").textContent = Math.round(current.relative_humidity_2m);
    document.getElementById("weather-wind").textContent = Math.round(current.wind_speed_10m);
    document.getElementById("weather-description").textContent = weatherCodeToText(current.weather_code);
    document.getElementById("weather-icon").textContent = weatherCodeToEmoji(current.weather_code);

    document.querySelector(".weather-loading").style.display = "none";
    document.getElementById("weather-content").style.display = "block";
  } catch (error) {
    console.warn("Cuaca gagal dimuat:", error);
    document.querySelector(".weather-loading").textContent = "Data cuaca sementara tidak tersedia.";
  }
}

function weatherCodeToText(code) {
  if (code === 0) return "Cerah";
  if (code >= 1 && code <= 3) return "Berawan";
  if (code >= 45 && code <= 48) return "Berkabut";
  if (code >= 51 && code <= 67) return "Hujan ringan";
  if (code >= 71 && code <= 77) return "Salju";
  if (code >= 80 && code <= 82) return "Hujan";
  if (code >= 95) return "Badai";
  return "Tidak diketahui";
}

function weatherCodeToEmoji(code) {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "🌤️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}
