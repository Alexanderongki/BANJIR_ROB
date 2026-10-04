const fs = require('fs');
const path = require('path');

/**
 * Pembaca berkas metadata raster. Tidak ada operasi tulis di sini karena
 * raster diperbarui lewat docs/convert_raster.py, bukan lewat API.
 */
const META_PATH = path.join(__dirname, '..', 'data', 'raster-meta.json');

function loadMeta() {
  const raw = fs.readFileSync(META_PATH, 'utf-8');
  return JSON.parse(raw);
}

module.exports = { loadMeta, META_PATH };
