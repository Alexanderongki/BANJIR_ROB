# Menyiapkan citra foto udara sebagai lapisan ubin (tile)

Citra foto udara yang berukuran besar (ratusan MB ke atas) tidak ditampilkan sebagai satu gambar utuh, melainkan dipecah menjadi ubin kecil per level zoom, persis seperti cara Google Maps atau OpenStreetMap menyajikan peta dasarnya. Proses ini dikerjakan satu kali di komputer Anda sendiri memakai `gdal2tiles.py`, lalu hasilnya disalin ke proyek ini.

## Prasyarat

Dibutuhkan GDAL yang sudah menyertakan `gdal2tiles.py`. Kalau QGIS sudah terpasang di komputer Anda, `gdal2tiles.py` biasanya sudah ikut terpasang dan bisa dipanggil lewat OSGeo4W Shell (di Windows, cari "OSGeo4W Shell" di menu Start, biasanya muncul berbarengan dengan instalasi QGIS).

Kalau belum punya GDAL sama sekali, cara paling mudah memasangnya adalah lewat conda.

```bash
conda install -c conda-forge gdal
```

## Langkah-langkah

**1. Pastikan citra sudah bergeoreferensi**

Berkas sumbernya harus GeoTIFF dengan sistem koordinat yang sudah benar (hasil ekspor dari Pix4D, Agisoft Metashape, DroneDeploy, atau mosaik yang sudah digeoreferensi di QGIS). Kalau belum yakin, buka di QGIS dan pastikan posisinya sudah pas di atas peta dasar.

**2. Jalankan gdal2tiles.py**

Dari OSGeo4W Shell atau terminal yang sudah mengenali GDAL, jalankan perintah berikut (ganti path sesuai lokasi berkas Anda).

```bash
gdal2tiles.py -p mercator -w none --processes=4 /path/ke/citra_udara.tif ortho-tiles
```

Penjelasan tiap bagian perintah. `-p mercator` memakai proyeksi Web Mercator yang dipakai Leaflet dan hampir semua peta web. `-w none` membuat gdal2tiles.py hanya menghasilkan ubinnya saja tanpa halaman HTML viewer bawaan, karena viewer sudah dibuatkan tersendiri di proyek ini. `--processes=4` menjalankan proses secara paralel supaya lebih cepat untuk berkas berukuran besar, sesuaikan angkanya dengan jumlah core prosesor Anda. Level zoom tidak perlu ditentukan secara manual, gdal2tiles.py akan menghitung sendiri level zoom yang sesuai dengan resolusi asli citra Anda.

Proses ini bisa memakan waktu cukup lama untuk citra berukuran ratusan MB, tergantung spesifikasi komputer.

**3. Salin hasilnya ke proyek**

Perintah di atas menghasilkan folder `ortho-tiles` berisi struktur folder `{z}/{x}/{y}.png`. Salin seluruh ISI folder tersebut (bukan folder itu sendiri) ke dalam `backend/data/ortho-tiles/` pada proyek ini, menimpa berkas `.gitkeep` yang ada di sana.

**4. Jalankan ulang server**

```bash
cd backend
npm start
```

Buka `http://localhost:3000`, lalu di kontrol lapisan pada pojok kanan atas peta, pilih "Citra foto udara" untuk menggantikan peta jalan OpenStreetMap dengan citra Anda.

## Kalau ingin mengganti citra di kemudian hari

Hapus seluruh isi `backend/data/ortho-tiles/` lalu ulangi langkah 2 dan 3 dengan berkas yang baru.

## Kalau peramban terasa berat saat memilih lapisan citra

Itu tandanya level zoom maksimum yang dihasilkan terlalu tinggi untuk resolusi citra Anda. Tambahkan opsi `-z 10-18` (sesuaikan angka akhirnya) pada perintah gdal2tiles.py di langkah 2 untuk membatasi level zoom tertinggi yang dihasilkan.
