const path = require('path');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Menyajikan frontend statis (HTML/CSS/JS) dari folder ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Menyajikan PNG raster dan berkas TIF asli agar bisa dimuat atau diunduh langsung
app.use('/raster-assets', express.static(path.join(__dirname, 'data', 'raster')));

// Menyajikan ubin (tile) citra foto udara hasil gdal2tiles.py, lihat
// docs/generate_ortho_tiles.sh untuk cara membuatnya
app.use('/ortho-tiles', express.static(path.join(__dirname, 'data', 'ortho-tiles')));

app.use('/api', apiRoutes);

app.get('/api', (req, res) => {
  res.json({
    nama: 'API WebGIS Kerentanan Banjir Rob',
    endpoint: [
      'GET /api/meta',
      'GET /api/raster',
      'GET /api/classes',
      'GET /api/stats',
      'GET /raster-assets/cvi_overlay.png',
      'GET /raster-assets/Hasil_Overlay.tif',
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Frontend  : http://localhost:${PORT}`);
  console.log(`API       : http://localhost:${PORT}/api`);
});
