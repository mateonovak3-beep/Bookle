const LS_KEY = "bookle_reviews_v2";

function getCurrentFile() {
  const p = (location.pathname.split("/").pop() || "index.html").trim();
  return p.includes(".") ? p : p + ".html";
}

function setActiveNav() {
  const current = getCurrentFile();

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const raw = (a.getAttribute("href") || "").trim().replace(/^\.\//, "");
    const href = raw.includes(".") ? raw : raw + ".html";

    if (href === current) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    } else {
      a.classList.remove("active");
      a.removeAttribute("aria-current");
    }
  });
}

function loadReviews() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveReviews(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function clampRating(n) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return 1;
  if (x < 1) return 1;
  if (x > 5) return 5;
  return x;
}

function stars(n) {
  const k = clampRating(n);
  return "★".repeat(k) + "☆".repeat(5 - k);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function makeBookKey(title) {
  const t = String(title ?? "").trim().toLowerCase();

  
  const noDia = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  
  const slug = noDia
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug || "unknown";
}

function recenzijaLabel(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (n === 1) return "1 recenzija";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return n + " recenzije";
  return n + " recenzija";
}

function initReviewsPage() {
  const form = document.getElementById("reviewForm");
  if (!form) return; 

  const bookTitleEl = document.getElementById("bookTitle");
  const nameEl = document.getElementById("reviewerName");
  const ratingEl = document.getElementById("rating");
  const textEl = document.getElementById("reviewText");

  const listEl = document.getElementById("reviewsList");
  const emptyEl = document.getElementById("emptyState");
  const countEl = document.getElementById("reviewCount");
  const toastEl = document.getElementById("toastMsg");
  const clearAllBtn = document.getElementById("clearAllBtn");

  if (
    !bookTitleEl ||
    !ratingEl ||
    !textEl ||
    !listEl ||
    !emptyEl ||
    !countEl ||
    !toastEl ||
    !clearAllBtn
  ) {
    console.warn("Bookle: nedostaju elementi na recenzije.html");
    return;
  }

  let toastTimer;

  function showToast(msg, ok) {
    if (toastTimer) clearTimeout(toastTimer);

    toastEl.textContent = msg;
    toastEl.className = "mt-3 small " + (ok ? "text-success" : "text-danger");

    toastTimer = setTimeout(() => {
      toastEl.textContent = "";
      toastEl.className = "mt-3 small";
      toastTimer = null;
    }, 2500);
  }

  function validateForm() {
    let ok = true;

    [bookTitleEl, ratingEl, textEl].forEach((el) => el.classList.remove("is-invalid"));

    const title = bookTitleEl.value.trim();
    if (title.length < 2) {
      bookTitleEl.classList.add("is-invalid");
      ok = false;
    }

    if (!ratingEl.value) {
      ratingEl.classList.add("is-invalid");
      ok = false;
    }

    const txt = textEl.value.trim();
    if (txt.length < 20) {
      textEl.classList.add("is-invalid");
      ok = false;
    }

    return ok;
  }

  function renderList() {
    const reviews = loadReviews().slice();
    reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listEl.innerHTML = "";
    countEl.textContent = recenzijaLabel(reviews.length);

    if (reviews.length === 0) {
      emptyEl.classList.remove("d-none");
      return;
    }
    emptyEl.classList.add("d-none");

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];

      const title = r.bookTitle ? escapeHtml(r.bookTitle) : "Nepoznata knjiga";
      const who = r.reviewerName ? " · " + escapeHtml(r.reviewerName) : "";
      const date = new Date(r.createdAt || Date.now()).toLocaleDateString("hr-HR");

      const wrap = document.createElement("div");
      wrap.className = "review-card";

      wrap.innerHTML = `
        <div class="topbar"></div>
        <div class="p-3 p-md-4">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <h3 class="h5 mb-1">${title}</h3>
              <div class="text-muted small mb-2">${date}${who}</div>
            </div>
            <div class="stars fw-semibold" aria-label="Ocjena ${r.rating} od 5">
              ${stars(r.rating)}
            </div>
          </div>

          <p class="mb-3">${escapeHtml(r.text)}</p>

          <div class="d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-primary" data-delete="${escapeHtml(r.id)}">
              Obriši
            </button>
          </div>
        </div>
      `;

      listEl.appendChild(wrap);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Provjeri polja u formi.", false);
      return;
    }

    const title = bookTitleEl.value.trim();

    const review = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      bookKey: makeBookKey(title),
      bookTitle: title,
      reviewerName: nameEl ? nameEl.value.trim() : "",
      rating: clampRating(ratingEl.value),
      text: textEl.value.trim(),
      createdAt: Date.now(),
    };

    const all = loadReviews();
    all.push(review);
    saveReviews(all);

    form.reset();
    showToast("Recenzija spremljena ✅", true);
    renderList();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;

    const id = btn.getAttribute("data-delete");
    const filtered = loadReviews().filter((r) => r.id !== id);
    saveReviews(filtered);

    showToast("Recenzija obrisana.", true);
    renderList();
  });

  clearAllBtn.addEventListener("click", () => {
    const all = loadReviews();
    if (all.length === 0) {
      showToast("Nema ništa za obrisati.", false);
      return;
    }

    if (!confirm("Obrisati sve recenzije s ovog uređaja?")) return;

    localStorage.removeItem(LS_KEY);
    showToast("Sve recenzije obrisane.", true);
    renderList();
  });

  renderList();
}


function initRatingBadges() {
  const badges = document.querySelectorAll(".rating-badge");
  if (!badges.length) return;

  const reviews = loadReviews();

  function stats(bookKey) {
    let sum = 0;
    let cnt = 0;

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if (r.bookKey === bookKey) {
        sum += Number(r.rating) || 0;
        cnt += 1;
      }
    }

    if (cnt === 0) return null;
    return { avg: sum / cnt, count: cnt };
  }

  let bestAvg = -1;
  let bestEl = null;

  badges.forEach((b) => {
    const key = b.getAttribute("data-book") || "";
    const s = stats(key);

    if (!s) {
      b.textContent = "Nema ocjena";
      return;
    }

    const rounded = (Math.round(s.avg * 10) / 10).toFixed(1);
    b.textContent = `${rounded} ★ (${s.count})`;

    if (s.avg > bestAvg) {
      bestAvg = s.avg;
      bestEl = b;
    }
  });

  if (bestEl && bestAvg >= 0) {
    const key = bestEl.getAttribute("data-book") || "";
    const s = stats(key);
    const rounded = (Math.round(bestAvg * 10) / 10).toFixed(1);
    bestEl.textContent = `Top preporuka · ${rounded} ★ (${s ? s.count : 0})`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  initReviewsPage();
  initRatingBadges();
});