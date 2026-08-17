export const CONFIG = {
  center: [-6.8334, 107.2714],
  zoom: 14,
  dataPath: "data/",
  layers: {
    administrasi: "batas_desa.geojson",
    jalan: "jalan.geojson",
    sungai: "sungai.geojson",
    bangunan: "bangunan.geojson",
    umkm: "umkm.geojson",
    wisata: "wisata.geojson",
  },
};

// Pengganti Global Variable agar terpusat
export const state = {
  map: null,
  baseMap: null,
  layerGroups: {},
  geojsonData: {},
  measurementLayer: null,
  layerControl: null,
};
