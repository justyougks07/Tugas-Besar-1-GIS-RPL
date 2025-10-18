// File: js/map.js
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi peta
  const map = L.map("map").setView([-0.905, 119.870], 13);

  // Tambahkan layer OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const sidebar = document.getElementById("sidebar");
  const searchInput = document.getElementById("search-input");

  let markers = [];
  let gerejaList = [];

  // 🔥 Ambil data dari Firebase Realtime Database
  function loadGerejaData() {
    if (!window.db || !window.firebaseRef || !window.firebaseOnValue) {
      console.error("Firebase belum siap!");
      return;
    }

    const dbRef = window.firebaseRef(window.db, "gereja");
    window.firebaseOnValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      gerejaList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      // Hapus semua marker lama
      markers.forEach((m) => map.removeLayer(m.marker));
      markers = [];

      // Tambahkan marker baru
      gerejaList.forEach((g) => {
        const marker = L.marker([g.lat, g.lng]).addTo(map);
        marker.bindTooltip(
          `<img src="${g.foto}" width="80" style="border-radius:5px;"><br>${g.nama}`,
          { direction: "top" }
        );
        marker.on("click", () => showSidebar(g));
        markers.push({ marker, data: g });
      });
    });
  }

  // Sidebar info
  function showSidebar(g) {
    sidebar.innerHTML = `
      <img src="${g.foto}" alt="${g.nama}">
      <h3>${g.nama}</h3>
      <p>${g.jadwal}</p>
    `;
    sidebar.style.display = "block";
  }

  // 🔍 Fitur pencarian
  searchInput.addEventListener("keyup", function () {
    const keyword = this.value.toLowerCase();
    const result = gerejaList.find((g) =>
      g.nama.toLowerCase().includes(keyword)
    );

    if (result) {
      map.setView([result.lat, result.lng], 16);
      showSidebar(result);
    }
  });

  // Jalankan
  loadGerejaData();
});
