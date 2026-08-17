const path = require('path');

module.exports = {
  // Mode development untuk saat ngoding, nanti ubah ke 'production' saat siap rilis
  mode: 'development', 
  
  // Titik masuk aplikasi
  entry: './src/js/main.js', 
  
  // Hasil output setelah di-bundle
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/', // Path publik untuk dev server
  },
  
  // Konfigurasi dev server sebagai pengganti Live Server
  devServer: {
    static: {
      directory: path.join(__dirname, './'), 
    },
    compress: true,
    port: 9000, // Berjalan di http://localhost:9000
    open: true, // Otomatis membuka browser
  },
  
  // Aturan untuk memproses file CSS
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};