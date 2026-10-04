const express = require('express');
const { loadMeta } = require('../db');

const router = express.Router();

// GET /api/meta - judul proyek, wilayah kajian, keterangan metodologi dan catatan
router.get('/meta', (req, res) => {
  const data = loadMeta();
  res.json(data.meta);
});

// GET /api/raster - seluruh info raster (ukuran, batas koordinat, sumber berkas)
router.get('/raster', (req, res) => {
  const data = loadMeta();
  res.json(data.raster);
});

// GET /api/classes - daftar kelas kerentanan beserta warna dan jumlah piksel
router.get('/classes', (req, res) => {
  const data = loadMeta();
  res.json(data.classes);
});

// GET /api/stats - ringkasan luas total dan persentase tiap kelas
router.get('/stats', (req, res) => {
  const data = loadMeta();
  const totalPx = data.classes.reduce((s, c) => s + c.pixel_count, 0);
  const totalKm2 = (totalPx * data.raster.pixel_area_m2) / 1_000_000;
  res.json({
    total_piksel_valid: totalPx,
    perkiraan_luas_km2: Math.round(totalKm2 * 100) / 100,
    per_kelas: data.classes.map((c) => ({
      label: c.label,
      pixel_count: c.pixel_count,
      persen: Math.round((c.pixel_count / totalPx) * 1000) / 10,
      perkiraan_luas_km2: Math.round(((c.pixel_count * data.raster.pixel_area_m2) / 1_000_000) * 100) / 100,
    })),
  });
});

module.exports = router;
