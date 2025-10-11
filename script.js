document.addEventListener("DOMContentLoaded", function () {
  const content = document.getElementById("content");
  const links = document.querySelectorAll(".a-navbar");
  const highlight = document.querySelector(".highlight");
  let mapInstance = null;

  async function loadPage(page) {
    try {
      const res = await fetch(`pages/${page}.html`);
      if (!res.ok) {
        content.innerHTML = "<p>Halaman tidak ditemukan.</p>";
        content.dataset.page = "";
        return;
      }

      // optional fade out
      content.style.opacity = 0;

      const html = await res.text();
      setTimeout(() => {
        content.innerHTML = html;
        content.dataset.page = page;
        setActiveNav(page);
        moveHighlightTo(page);
        runPageSpecific(page);
        content.style.opacity = 1;
      }, 150);

    } catch (err) {
      console.error("Error load page:", err);
      content.innerHTML = "<p>Terjadi kesalahan saat memuat halaman.</p>";
    }
  }

  function setActiveNav(page) {
    links.forEach(a => {
      const li = a.closest(".nav-item");
      if (a.getAttribute("href") === `#${page}`) li.classList.add("active");
      else li.classList.remove("active");
    });
  }

  function moveHighlightTo(page) {
    if (!highlight) return;
    const activeLink = document.querySelector(`.a-navbar[href="#${page}"]`);
    if (!activeLink) return;
    const rect = activeLink.getBoundingClientRect();
    const navRect = activeLink.closest(".navbar").getBoundingClientRect();
    highlight.style.width = rect.width + "px";
    highlight.style.left = rect.left - navRect.left + "px";
  }

  function runPageSpecific(page) {
    if (page === "map") initMap();
    else {
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    }
  }

  function initMap() {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;

    // hapus instance lama bila ada
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }

    mapInstance = L.map("map").setView([-0.898728, 119.870716], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapInstance);

    L.marker([-0.898728, 119.870716]).addTo(mapInstance).bindPopup("<b>GSJA Kalvari</b>");
    L.marker([-0.900123, 119.873456]).addTo(mapInstance).bindPopup("<b>GMIM Bethesda</b>");
    L.marker([-0.905678, 119.880321]).addTo(mapInstance).bindPopup("<b>GKST Immanuel</b>");

    // kadang butuh invalidateSize supaya tiles tampil benar
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 200);
  }

  // click handler nav
  links.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.getAttribute("href").substring(1);
      if (!page) return;
      window.location.hash = page;
      loadPage(page);
    });
  });

  // handle back/forward
  window.addEventListener("hashchange", () => {
    const page = window.location.hash.substring(1) || "home";
    loadPage(page);
  });

  // initial load
  const initial = window.location.hash.substring(1) || "home";
  loadPage(initial);

  // adjust highlight on resize
  window.addEventListener("resize", () => {
    const current = content.dataset.page || window.location.hash.substring(1) || "home";
    moveHighlightTo(current);
  });
});
