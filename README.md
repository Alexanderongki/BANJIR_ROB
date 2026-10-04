# WebGIS Kerentanan Banjir Rob (Raster Hasil Overlay Pembobotan)

Aplikasi ini menampilkan peta kerentanan wilayah pesisir terhadap banjir rob (genangan air laut akibat pasang surut) dalam bentuk raster hasil overlay pembobotan (weighted overlay) berbasis SIG. Raster yang ditampilkan adalah `Hasil_Overlay.tif`, yaitu keluaran langsung dari analisis yang sudah dikerjakan di perangkat SIG (ArcGIS atau QGIS), bukan data simulasi.

Sistem terdiri dari dua bagian, yaitu backend yang menyajikan berkas raster beserta metadatanya melalui REST API, dan frontend yang menampilkan raster tersebut di atas peta interaktif.

## Tentang data

Raster `Hasil_Overlay.tif` berisi nilai piksel 1 sampai 5 yang mewakili lima kelas kerentanan (Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi), dengan nilai 255 sebagai piksel tanpa data (di luar area kajian). Sistem sudah membaca koordinat dan rentang nilai ini secara otomatis dari berkas aslinya.

Wilayah kajian berada pada koordinat sekitar 105.22 sampai 105.26 BT dan -5.54 sampai -5.57 LS, yang setelah dicocokkan terhadap data batas administrasi terbuka (GADM) berada pada Kabupaten Lampung Selatan, Provinsi Lampung. Pencocokan ini hanya untuk memberi konteks lokasi pada tampilan peta, bukan bagian dari hasil analisis.

Perkiraan luas wilayah pada panel ringkasan dihitung dari ukuran piksel dalam koordinat geografis (EPSG:4326), sehingga bersifat kasar. Untuk angka luas yang presisi sesuai proyeksi yang Anda pakai, gunakan hasil perhitungan dari QGIS atau ArcGIS secara langsung.

## Struktur folder

```
webgis-banjir-rob/
├── README.md
├── backend/
│   ├── package.json
│   ├── server.js                titik masuk server Express
│   ├── src/
│   │   ├── db.js                 pembaca berkas raster-meta.json
│   │   └── routes/api.js         seluruh endpoint REST API
│   └── data/
│       ├── raster-meta.json      metadata (batas koordinat, daftar kelas, statistik piksel)
│       ├── raster/
│       │   ├── Hasil_Overlay.tif asli yang diunggah
│       │   └── cvi_overlay.png   versi berwarna untuk ditampilkan di peta
│       └── ortho-tiles/          ubin citra foto udara, diisi lewat gdal2tiles.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js                    pengambilan data dari API, render peta, dan pembaca piksel saat diklik
└── docs/
    ├── convert_raster.py         skrip untuk mengganti raster CVI dengan berkas baru
    └── generate_ortho_tiles.md   cara menyiapkan citra foto udara sebagai lapisan ubin
```

## Prasyarat

Perangkat yang perlu tersedia di komputer Anda adalah Node.js versi 18 ke atas beserta npm, yang bisa diunduh melalui situs resmi nodejs.org. Tidak dibutuhkan instalasi database maupun pustaka pemrosesan raster di sisi server, karena backend hanya menyajikan berkas PNG dan metadata yang sudah jadi.

## Cara menjalankan

Seluruh perintah berikut dijalankan dari dalam folder `backend`.

```bash
cd backend
npm install
npm start
```

Setelah server aktif, frontend dapat dibuka langsung melalui `http://localhost:3000`, sedangkan API tersedia melalui `http://localhost:3000/api`. Server ini sekaligus menyajikan file frontend dan berkas raster secara statis, sehingga tidak diperlukan server terpisah untuk keduanya.

Untuk pengembangan dengan pemuatan ulang otomatis saat kode diubah, gunakan `npm run dev` sebagai gantinya.

## Dokumentasi API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/meta` | Judul proyek, wilayah kajian, dan keterangan metodologi |
| GET | `/api/raster` | Informasi raster, yaitu ukuran piksel, sistem koordinat, dan batas wilayah |
| GET | `/api/classes` | Daftar lima kelas kerentanan beserta warna dan jumlah piksel |
| GET | `/api/stats` | Perkiraan luas total dan persentase tiap kelas |
| GET | `/raster-assets/cvi_overlay.png` | Raster berwarna yang ditampilkan di peta |
| GET | `/raster-assets/Hasil_Overlay.tif` | Berkas raster asli, bisa diunduh langsung |

## Mengganti dengan raster yang baru

Kalau Anda mengulang analisis dan mendapat hasil overlay yang baru, jalankan skrip berikut dari folder utama proyek (di luar folder backend).

```bash
pip install rasterio pillow numpy
python docs/convert_raster.py /path/ke/raster_baru.tif
```

Skrip ini membaca raster baru, menghitung ulang statistik tiap kelas, menuliskan ulang `backend/data/raster-meta.json`, dan menyalin raster beserta versi PNG berwarnanya ke `backend/data/raster/`. Setelah skrip selesai, jalankan ulang `npm start` di folder backend, lalu muat ulang halaman di browser.

Kalau nilai piksel pada raster baru bukan 1 sampai 5, atau raster berada pada CRS terproyeksi (satuan meter, bukan derajat), sesuaikan bagian `CLASS_COLORS` dan perhitungan `pixel_area_m2` di dalam `docs/convert_raster.py` mengikuti data Anda.

## Tampilan peta

Peta memakai kontrol lapisan di pojok kanan atas untuk berpindah antara peta jalan OpenStreetMap dan citra foto udara (kalau sudah disiapkan), serta kotak centang untuk menampilkan atau menyembunyikan lapisan kerentanan CVI. Transparansi lapisan CVI diatur lewat penggeser di bawah kontrol lapisan tersebut. Skala peta tampil di pojok kanan bawah, dan koordinat kursor tampil di pojok kiri bawah.

Mengklik area berwarna pada peta menampilkan kelas kerentanan pada titik itu langsung sebagai balon info di atas peta, sekaligus mencatatnya pada panel "Titik yang diklik" di sidebar.

## Menambahkan citra foto udara

Kalau Anda punya citra foto udara (orthophoto) berukuran besar, lihat `docs/generate_ortho_tiles.md` untuk cara memecahnya menjadi ubin (tile) memakai `gdal2tiles.py` di komputer Anda sendiri, lalu menempatkannya di `backend/data/ortho-tiles/`. Setelah itu, pilihan "Citra foto udara" pada kontrol lapisan akan langsung menampilkannya.

## Metodologi dan referensi

Pendekatan yang dipakai adalah Coastal Vulnerability Index (CVI) yang dihasilkan lewat overlay pembobotan (weighted overlay), yaitu setiap parameter fisik pesisir direklasifikasi ke skala umum lalu digabungkan dengan bobot masing-masing memakai Weighted Overlay pada ArcGIS Spatial Analyst atau perhitungan berbobot lewat Raster Calculator pada QGIS, menghasilkan satu raster kelas akhir seperti `Hasil_Overlay.tif` ini.

Kerangka konsep CVI merujuk pada Gornitz (1990) dan Thieler & Hammar-Klose (2000), yang pada formula aslinya memakai rata-rata geometris dari peringkat tiap parameter. Overlay pembobotan yang dipakai pada raster ini adalah varian penjumlahan berbobot yang lebih umum dipakai pada analisis multi kriteria berbasis SIG, sebagaimana diterapkan pada kajian kerentanan Pantai Indramayu oleh Kasim & Siregar (2012, Forum Geografi) dan kajian pemetaan kerentanan pesisir Teluk Doreri, Papua Barat oleh Loinenak, Hartoko, & Muskananfola (2015, International Journal of Technology).

## Sumber data batas wilayah

Pencocokan lokasi raster terhadap Kabupaten Lampung Selatan memakai data terbuka batas administrasi Indonesia (`wabiwabo/geojson-political-indonesia`), yang bersumber dari GADM (gadm.org). Data ini dipakai hanya sebagai konteks lokasi dan sebaiknya diverifikasi ulang terhadap data resmi Badan Informasi Geospasial (BIG) atau instansi terkait sebelum dipakai dalam laporan resmi.

## Lisensi

Kode pada proyek ini bebas dipakai, diubah, dan dikembangkan lebih lanjut untuk keperluan akademik maupun non-akademik.
