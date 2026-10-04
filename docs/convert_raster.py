"""
Mengubah raster hasil overlay pembobotan (GeoTIFF, nilai piksel 1-5 plus
nodata) menjadi PNG berwarna beserta berkas metadata yang dibaca oleh
backend (backend/data/raster-meta.json).

Jalankan setiap kali ada raster baru yang ingin dipakai menggantikan
Hasil_Overlay.tif saat ini. Hasilnya langsung menimpa cvi_overlay.png dan
raster-meta.json di folder backend/data/.

Instalasi paket yang dibutuhkan (sekali saja).
    pip install rasterio pillow numpy

Cara pakai.
    python convert_raster.py /path/ke/raster_baru.tif
"""
import sys
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RASTER_DIR = ROOT / "backend" / "data" / "raster"
META_PATH = ROOT / "backend" / "data" / "raster-meta.json"

# Palet warna untuk kelas 1 sampai 5, dari paling aman ke paling rawan.
# Ganti di sini kalau ingin skema warna yang berbeda.
CLASS_COLORS = {
    1: (58, 124, 165, 255),   # Sangat Rendah
    2: (76, 154, 106, 255),   # Rendah
    3: (217, 180, 74, 255),   # Sedang
    4: (217, 127, 61, 255),   # Tinggi
    5: (192, 72, 60, 255),    # Sangat Tinggi
}
CLASS_LABELS = {1: "Sangat Rendah", 2: "Rendah", 3: "Sedang", 4: "Tinggi", 5: "Sangat Tinggi"}


def convert(tif_path: Path):
    with rasterio.open(tif_path) as src:
        band = src.read(1)
        bounds = src.bounds
        res = src.res
        nodata = src.nodata if src.nodata is not None else 255

    h, w = band.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    for value, color in CLASS_COLORS.items():
        rgba[band == value] = color

    RASTER_DIR.mkdir(parents=True, exist_ok=True)
    png_path = RASTER_DIR / "cvi_overlay.png"
    Image.fromarray(rgba, mode="RGBA").save(png_path)

    tif_dest = RASTER_DIR / tif_path.name
    if tif_path.resolve() != tif_dest.resolve():
        tif_dest.write_bytes(tif_path.read_bytes())

    valid = band[band != nodata]
    total_valid = int(valid.size)

    # Perkiraan luas per piksel. Hanya akurat kalau raster dalam koordinat
    # geografis (EPSG:4326); kalau raster Anda dalam CRS terproyeksi
    # (satuan meter), ganti baris pixel_area_m2 dengan res[0] * res[1] saja.
    lat_mid = (bounds.top + bounds.bottom) / 2
    m_per_deg_lat = 111320
    m_per_deg_lon = 111320 * math.cos(math.radians(abs(lat_mid)))
    pixel_area_m2 = (res[0] * m_per_deg_lon) * (res[1] * m_per_deg_lat)

    classes = []
    for value, label in CLASS_LABELS.items():
        n = int((valid == value).sum())
        classes.append({
            "value": value,
            "label": label,
            "color": "#%02x%02x%02x" % CLASS_COLORS[value][:3],
            "pixel_count": n,
        })

    meta = json.loads(META_PATH.read_text()) if META_PATH.exists() else {"meta": {}}
    meta["raster"] = {
        "file": tif_dest.name,
        "image": "cvi_overlay.png",
        "crs": "EPSG:4326",
        "width": w,
        "height": h,
        "bounds": {"west": bounds.left, "south": bounds.bottom, "east": bounds.right, "north": bounds.top},
        "nodata_value": nodata,
        "pixel_area_m2": round(pixel_area_m2, 2),
    }
    meta["classes"] = classes
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    print(f"Selesai. Total piksel valid: {total_valid}")
    for c in classes:
        pct = c["pixel_count"] / total_valid * 100 if total_valid else 0
        print(f"  {c['label']:16s} {c['pixel_count']:6d} piksel ({pct:4.1f}%)")
    print(f"\nPNG ditulis ke {png_path}")
    print(f"Metadata ditulis ke {META_PATH}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Pemakaian: python convert_raster.py /path/ke/raster.tif")
        sys.exit(1)
    convert(Path(sys.argv[1]))
