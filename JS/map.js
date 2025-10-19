// map.js: provides initMap() which is safe to call after the page HTML
// has been injected into the DOM. This avoids race conditions when the
// SPA inserts the markup and then loads this module.

let map = null;
let sidebar = null;
let searchInput = null;
let markers = [];
let gerejaList = [];

function createMap() {
  map = L.map("map").setView([-0.905, 119.870], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // ensure redraws after layout changes
  function ensureMapRenders() {
    try {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 800);
    } catch (e) {
      console.warn("invalidateSize failed", e);
    }
  }

  window.addEventListener("resize", () => { try { map.invalidateSize(); } catch (e) {} });
  setTimeout(ensureMapRenders, 200);
}

// 🔥 Ambil data dari Firebase dan tambahkan marker
function loadGerejaData() {
  if (!window.db || !window.firebaseRef || !window.firebaseOnValue) {
    console.warn("Firebase belum siap, menunggu inisialisasi...");
    return;
  }

  const dbRef = window.firebaseRef(window.db, "gereja");
  window.firebaseOnValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    gerejaList = Object.keys(data).map((key) => ({ id: key, ...data[key] }));

    // clear old markers
    markers.forEach((m) => { try { map.removeLayer(m.marker); } catch (e) {} });
    markers = [];

    gerejaList.forEach((g) => {
      if (!g.lat || !g.lng) return;
      const marker = L.marker([g.lat, g.lng]).addTo(map);

      marker.bindTooltip(
        `<img src="${g.foto}" width="80" style="border-radius:5px;"><br><b>${g.nama}</b>`,
        { direction: "top" }
      );

      marker.on("click", () => showSidebar(g));
      markers.push({ marker, data: g });
    });
  });
}

function showSidebar(g) {
  if (!sidebar) return;
  sidebar.innerHTML = `
    <img src="${g.foto}" alt="${g.nama}">
    <h3>${g.nama}</h3>
    <p>${g.jadwal || "Jadwal tidak tersedia"}</p>
    <p><b>Alamat:</b> ${g.alamat || "-"}</p>
  `;
  sidebar.style.display = "block";
}

function attachSearch() {
  if (!searchInput) return;

  // ensure suggestions container exists (reuse if present)
  let suggestions = document.getElementById('search-suggestions');
  if (!suggestions) {
    suggestions = document.createElement('ul');
    suggestions.id = 'search-suggestions';
    suggestions.setAttribute('role', 'listbox');
    suggestions.hidden = true;
    // put it inside the search container if present, otherwise next to input
    const sc = document.getElementById('search-container');
    if (sc) sc.appendChild(suggestions);
    else searchInput.parentNode.appendChild(suggestions);
  }

  const searchBtn = document.getElementById('search-btn');

  function formatSuggestionItem(g) {
    const li = document.createElement('li');
    li.tabIndex = -1;
    li.setAttribute('role', 'option');
    li.dataset.id = g.id;
    li.innerHTML = `<strong>${g.nama}</strong><br><small style="color:#666">${g.alamat || g.kecamatan || ''}</small>`;
    return li;
  }

  function findMarkerById(id) {
    const entry = markers.find(m => (m.data && String(m.data.id) === String(id)));
    return entry ? entry.marker : null;
  }

  function simpleSearch(){
    const q = (searchInput.value || '').trim().toLowerCase();
    if(!q) return;
    const source = (gerejaList && gerejaList.length) ? gerejaList : markers.map(m => m.data).filter(Boolean);
    const found = source.find(c => (c.nama && c.nama.toLowerCase().includes(q)) || (c.alamat && c.alamat.toLowerCase().includes(q)));
    if(found){
      const m = findMarkerById(found.id);
      if(m){ map.setView(m.getLatLng(),16,{animate:true}); m.openPopup(); }
      else if(found.lat && found.lng){ map.setView([found.lat, found.lng],16,{animate:true}); }
      showSidebar(found);
    }
  }

  searchInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); simpleSearch(); } });
  if(searchBtn) searchBtn.addEventListener('click', ()=>{ simpleSearch(); searchInput.focus(); });
}

// Public init function
export async function initMap() {
  // ensure DOM elements exist
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error("#map not found in DOM");
    return;
  }

  sidebar = document.getElementById("sidebar");
  searchInput = document.getElementById("search-input");

  createMap();
  attachSearch();

  // try to load data (if Firebase ready)
  try { loadGerejaData(); } catch (e) { console.warn("loadGerejaData failed", e); }

  // small safety: ensure size after initialization
  setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 250);
}
