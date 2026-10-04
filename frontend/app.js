const API_BASE = "/api";

async function getJSON(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`Gagal memuat ${path}: ${res.status}`);
  return res.json();
}

function initMap() {
  const map = L.map("map", { 
    center: [-5.5523, 105.2385], // Mengarahkan peta tepat ke tengah citra Anda
    zoom: 22,                    // Langsung zoom maksimal ke level 22
    zoomControl: true, 
    maxZoom: 22 
});

  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxZoom: 22,
  }).addTo(map);

  // Citra foto udara, muncul di daftar lapisan begitu ubinnya ada di
  // backend/data/ortho-tiles/ (lihat docs/generate_ortho_tiles.sh). Kalau
  // belum ada, lapisan ini akan tampak kosong saat dipilih, bukan error.
  const orthoLayer = L.tileLayer("/ortho-tiles/{z}/{x}/{y}.png", {
    attribution: "Citra foto udara",
    maxZoom: 22,
    maxNativeZoom: 22,
    minZoom: 1,
  });

  const layersControl = L.control
    .layers(
      { "Peta jalan (OSM)": osmLayer, "Citra foto udara": orthoLayer },
      {},
      { position: "topright", collapsed: false }
    )
    .addTo(map);

  L.control.scale({ metric: true, imperial: false, position: "bottomright" }).addTo(map);

  // Kontrol transparansi dibuat sebagai Leaflet control biasa (bukan div
  // posisi bebas) supaya otomatis tersusun rapi di bawah kontrol lapisan,
  // bukan saling tumpuk.
  const OpacityControl = L.Control.extend({
    options: { position: "topright" },
    onAdd() {
      const div = L.DomUtil.create("div", "leaflet-bar opacity-control");
      div.innerHTML = `
        <label for="opacity-slider">Transparansi lapisan CVI</label>
        <input type="range" id="opacity-slider" min="0" max="100" value="88" />
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    },
  });
  new OpacityControl().addTo(map);

  return { map, layersControl };
}

function renderLegend(classes) {
  const ul = document.getElementById("legend-list");
  ul.innerHTML = "";
  for (const c of classes) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch" style="background:${c.color}"></span><span>${c.label}</span>`;
    ul.appendChild(li);
  }
}

function renderStats(stats) {
  document.getElementById("stat-luas").textContent = stats.perkiraan_luas_km2.toFixed(2);

  const container = document.getElementById("stat-per-kelas");
  container.innerHTML = "";
  const max = Math.max(1, ...stats.per_kelas.map((k) => k.pixel_count));
  const colorByLabel = {};
  for (const row of CLASSES_CACHE) colorByLabel[row.label] = row.color;

  for (const row of stats.per_kelas) {
    const div = document.createElement("div");
    div.className = "class-bar-row";
    const color = colorByLabel[row.label] || "#888";
    div.innerHTML = `
      <span class="swatch" style="background:${color}"></span>
      <span class="name">${row.label}</span>
      <span class="class-bar-track">
        <span class="class-bar-fill" style="width:${(row.pixel_count / max) * 100}%; background:${color}"></span>
      </span>
      <span class="count">${row.persen}%</span>
    `;
    container.appendChild(div);
  }
}

// --- fitur klik untuk membaca kelas pada titik yang diklik ---
let canvasCtx = null;
let rasterInfo = null;
let CLASSES_CACHE = [];

function setupPixelReader(raster) {
  rasterInfo = raster;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = raster.width;
    canvas.height = raster.height;
    canvasCtx = canvas.getContext("2d");
    canvasCtx.drawImage(img, 0, 0);
  };
  img.src = "/raster-assets/" + raster.image;
}

function classAtLatLng(lat, lng) {
  if (!canvasCtx || !rasterInfo) return null;
  const { bounds, width, height } = rasterInfo;
  if (lng < bounds.west || lng > bounds.east || lat < bounds.south || lat > bounds.north) return null;

  const px = Math.floor(((lng - bounds.west) / (bounds.east - bounds.west)) * width);
  const py = Math.floor(((bounds.north - lat) / (bounds.north - bounds.south)) * height);
  if (px < 0 || px >= width || py < 0 || py >= height) return null;

  const pixel = canvasCtx.getImageData(px, py, 1, 1).data;
  if (pixel[3] === 0) return null;

  const hex = "#" + [pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  return CLASSES_CACHE.find((c) => c.color.toLowerCase() === hex.toLowerCase()) || null;
}

function updateKlikPanel(cls, latlng) {
  const hasil = document.getElementById("klik-hasil");
  const hint = document.getElementById("klik-hint");
  const panel = document.getElementById("panel-klik");
  panel.open = true;

  if (!cls) {
    hasil.hidden = true;
    hint.hidden = false;
    hint.textContent = "Titik yang diklik berada di luar area kajian. Coba klik di dalam area berwarna.";
    return;
  }
  hint.hidden = true;
  hasil.hidden = false;
  const tag = document.getElementById("klik-class");
  tag.textContent = cls.label;
  tag.style.background = cls.color + "33";
  tag.style.color = cls.color;
  document.getElementById("klik-coord").textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function showMapPopup(map, cls, latlng) {
  const content = cls
    ? `<b>Kelas kerentanan</b><br/><span class="popup-class-tag" style="background:${cls.color}33;color:${cls.color}">${cls.label}</span>`
    : `<b>Di luar area kajian</b><br/>Coba klik di dalam wilayah berwarna.`;
  L.popup({ closeButton: true, offset: [0, -4] }).setLatLng(latlng).setContent(content).openOn(map);
}

async function main() {
  const { map, layersControl } = initMap();

  const [meta, raster, classes, stats] = await Promise.all([
    getJSON("/meta"),
    getJSON("/raster"),
    getJSON("/classes"),
    getJSON("/stats"),
  ]);
  CLASSES_CACHE = classes;

  document.getElementById("meta-wilayah").textContent = meta.wilayah;
  document.getElementById("meta-metodologi").textContent = "Overlay Pembobotan";
  document.getElementById("meta-metodologi").title = meta.metodologi;
  document.getElementById("meta-sumber").textContent = meta.sumber_raster;
  document.getElementById("meta-catatan-luas").textContent = meta.catatan_luas;
  document.getElementById("meta-disclaimer").textContent = meta.catatan_wilayah;

  const b = raster.bounds;
  const leafletBounds = [[b.south, b.west], [b.north, b.east]];
  const overlay = L.imageOverlay("/raster-assets/" + raster.image, leafletBounds, { opacity: 0.88 }).addTo(map);
  layersControl.addOverlay(overlay, "Kerentanan banjir rob (CVI)");
  map.fitBounds(leafletBounds, { padding: [40, 40] });

  renderLegend(classes);
  renderStats(stats);
  setupPixelReader(raster);

  document.getElementById("opacity-slider").addEventListener("input", (e) => {
    overlay.setOpacity(Number(e.target.value) / 100);
  });

  const coordEl = document.getElementById("coord-readout");
  map.on("mousemove", (e) => {
    coordEl.textContent = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
  });
  map.on("mouseout", () => { coordEl.textContent = "– , –"; });

  map.on("click", (e) => {
    const cls = classAtLatLng(e.latlng.lat, e.latlng.lng);
    updateKlikPanel(cls, e.latlng);
    showMapPopup(map, cls, e.latlng);
  });
}

main().catch((err) => {
  console.error(err);
  const wrap = document.querySelector(".map-wrap");
  wrap.innerHTML = `<div style="padding:32px;color:#edf2f4;font-family:sans-serif">
    <h2>Tidak dapat memuat data</h2>
    <p style="color:#8fa6b8">Pastikan server backend berjalan (npm start di folder backend) dan API dapat diakses di /api.</p>
    <p style="color:#8fa6b8;font-family:monospace">${err.message}</p>
  </div>`;
});
