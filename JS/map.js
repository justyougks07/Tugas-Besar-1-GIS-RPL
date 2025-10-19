// map.js: provides initMap() which is safe to call after the page HTML
// has been injected into the DOM. This avoids race conditions when the
// SPA inserts the markup and then loads this module.

let map = null;
let sidebar = null;
let searchInput = null;
let markers = [];
let gerejaList = [];

// create or return a global body-level sidebar to avoid clipping issues
function ensureGlobalSidebar(){
  let g = document.getElementById('global-sidebar');
  if(g) return g;
  g = document.createElement('aside');
  g.id = 'global-sidebar';
  g.style.position = 'fixed';
  g.style.left = '0';
  g.style.top = '84px';
  g.style.width = '360px';
  g.style.maxWidth = '92vw';
  g.style.height = 'calc(100vh - 100px)';
  g.style.background = '#fff';
  g.style.boxShadow = '8px 0 24px rgba(0,0,0,0.12)';
  g.style.padding = '16px';
  g.style.boxSizing = 'border-box';
  g.style.transform = 'translateX(-110%)';
  g.style.transition = 'transform .28s ease';
  g.style.zIndex = '400000';
  g.style.overflow = 'auto';
  g.style.display = 'none';
  const btn = document.createElement('button');
  btn.id = 'global-sidebar-close'; btn.textContent = '×';
  btn.style.position = 'absolute'; btn.style.right='8px'; btn.style.top='8px'; btn.style.border='none'; btn.style.background='transparent'; btn.style.fontSize='22px'; btn.style.cursor='pointer';
  const content = document.createElement('div'); content.id = 'global-sidebar-content';
  g.appendChild(btn);
  g.appendChild(content);
  document.body.appendChild(g);
  btn.addEventListener('click', ()=>{ try{ g.classList.remove('open'); g.style.transform='translateX(-110%)'; setTimeout(()=>{ g.style.display='none'; },320); }catch(e){} });
  // expose globally for other scripts
  try{ window.openSidebar = (d)=>{ showSidebar(d); }; window.getGlobalSidebar = ()=>document.getElementById('global-sidebar'); }catch(e){}
  return g;
}

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

      marker.on("click", () => { console.log('marker clicked ->', g.nama || g.id); try{ showSidebar(g); }catch(e){ console.warn('showSidebar failed', e); } });
      markers.push({ marker, data: g });
    });
  });
}

function showSidebar(g) {
  if (!sidebar) return;
  // defensive: prefer alamat but accept other field names
  const alamat = g.alamat || g.street || g.address || g.kecamatan || "-";
  const jadwal = g.jadwal || g.schedule || "Jadwal tidak tersedia";
  sidebar.innerHTML = `
    <div style="max-width:100%">
      <img src="${g.foto || ''}" onerror="this.onerror=null;this.src='image/Gereja.png';" alt="${g.nama}" style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:12px;">
      <h3 style="margin:6px 0">${g.nama}</h3>
      <p style="margin:6px 0">${jadwal}</p>
      <p style="margin:6px 0"><b>Alamat:</b> ${alamat}</p>
    </div>
  `;
  // ensure visible on desktop: add open class and defensive inline styles
  sidebar.style.display = "block";
  try{
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden','false');
    sidebar.style.transform = 'translateX(0)';
    sidebar.style.zIndex = '400000';
    sidebar.style.right = '0px';
  }catch(e){ console.warn('apply sidebar styles failed', e); }
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

  // prefer a global body-level sidebar to avoid clipping; fallback to local #sidebar
  sidebar = document.getElementById('global-sidebar') || document.getElementById("sidebar");
  if(!sidebar){
    try{ sidebar = ensureGlobalSidebar(); }catch(e){ console.warn('ensureGlobalSidebar failed', e); sidebar = document.getElementById("sidebar"); }
  }
  searchInput = document.getElementById("search-input");

  createMap();
  attachSearch();

  // try to load data (if Firebase ready)
  try { loadGerejaData(); } catch (e) { console.warn("loadGerejaData failed", e); }

  // small safety: ensure size after initialization
  setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 250);
}
