function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const count = document.getElementById("count");
const modal = document.getElementById("modal");

const PLACEHOLDER = "posters/placeholder.svg";

const els = {
  poster: document.getElementById("mPoster"),
  kicker: document.getElementById("mKicker"),
  title: document.getElementById("mTitle"),
  logline: document.getElementById("mLogline"),
  director: document.getElementById("mDirector"),
  producer: document.getElementById("mProducer"),
  writer: document.getElementById("mWriter"),
  prodCos: document.getElementById("mProdCos"),
  distributor: document.getElementById("mDistributor"),
  cast: document.getElementById("mCast"),
};

let films = [];

function join(v) {
  if (!v) return "TBD";
  return Array.isArray(v) ? v.filter(Boolean).join(", ") : String(v);
}

function getPoster(p) {
  return p && String(p).trim() !== "" ? p : PLACEHOLDER;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureUniqueSlugs(list) {
  const seen = new Map();
  return list.map((f) => {
    const base = f.slug && String(f.slug).trim() ? slugify(f.slug) : slugify(f.title) || "untitled";
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const unique = n === 1 ? base : `${base}-${n}`;
    return { ...f, slug: unique };
  });
}

function render(list) {
  if (!grid) return;

  grid.innerHTML = list.map((f) => `
    <button class="card" type="button" data-slug="${escapeHtml(f.slug)}" aria-label="Open ${escapeHtml(f.title)}">
      <div class="poster">
        <img src="${escapeHtml(getPoster(f.poster))}" alt="${escapeHtml(f.title)} poster"
             onerror="this.onerror=null;this.src='${escapeHtml(PLACEHOLDER)}'">
      </div>
      <div class="cardInfo">
        <div class="titleRow">
          <div>${escapeHtml(f.title || "")}</div>
          <div class="year">${escapeHtml(f.year || "")}</div>
        </div>
      </div>
    </button>
  `).join("");

  if (count) {
    count.textContent = `${list.length} project${list.length === 1 ? "" : "s"}`;
  }
}

function openFilm(slug, setHash = true) {
  if (!modal) return;
  const target = String(slug || "").trim();
  const f = films.find((x) => x.slug === target);
  if (!f) return;

  if (els.poster) {
    els.poster.src = getPoster(f.poster);
    els.poster.alt = `${f.title || "Film"} poster`;
    els.poster.onerror = () => { els.poster.src = PLACEHOLDER; };
  }

  const year = f.year ? String(f.year) : "";
  const genre = Array.isArray(f.genre) ? f.genre.join(", ") : (f.genre ? String(f.genre) : "");
  if (els.kicker) els.kicker.textContent = [year, genre].filter(Boolean).join(" • ");

  if (els.title) els.title.textContent = f.title || "";
  if (els.logline) els.logline.textContent = f.logline || "";

  if (els.director) els.director.textContent = join(f.director);
  if (els.producer) els.producer.textContent = join(f.producer);
  if (els.writer) els.writer.textContent = join(f.writer);
  if (els.prodCos) els.prodCos.textContent = join(f.productionCompanies);
  if (els.distributor) els.distributor.textContent = join(f.distributor);
  if (els.cast) els.cast.textContent = join(f.cast);

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (setHash) location.hash = target;
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (location.hash) history.replaceState(null, "", location.pathname);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches && t.matches("[data-close]")) closeModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("open")) closeModal();
});

if (grid) {
  grid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-slug]");
    if (!card) return;
    openFilm(card.dataset.slug);
  });
}

if (search) {
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    const filtered = !q ? films : films.filter((f) => JSON.stringify(f).toLowerCase().includes(q));
    render(filtered);
  });
}

async function init() {
  try {
    const res = await fetch("films.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load films.json (${res.status})`);
    const data = await res.json();

    const raw = Array.isArray(data.films) ? data.films : [];
    const normalized = raw.map((f) => {
      const title = f && f.title ? String(f.title) : "Untitled";
      const slug = f && f.slug ? String(f.slug) : "";
      return { ...f, title, slug };
    });

    films = ensureUniqueSlugs(normalized);
    render(films);

    const hashSlug = location.hash.replace("#", "").trim();
    if (hashSlug) openFilm(hashSlug, false);
  } catch (err) {
    console.error(err);
    if (count) count.textContent = "Failed to load projects";
  }
}

init();
