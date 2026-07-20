const MANIFEST_URL = "projects/manifest.json";
const DEFAULT_AVATAR = "assets/default-avatar.svg";
const DEFAULT_THUMB = "assets/default-thumb.svg";

const CATEGORY_LETTER = {
    proyectos: "P",
    robots: "R",
    juegos: "J",
    webs: "W",
};

const feedEl = document.getElementById("feed");
const filtersEl = document.getElementById("filters");
const emptyStateEl = document.getElementById("empty-state");
const loadErrorEl = document.getElementById("load-error");

let allProjects = [];
let activeCategory = "todos";

init ();

async function  init() {
    try {
        const manifest = await fetchJSON(MANIFEST_URL);
        const results = await Promise.allSettled(
            manifest.map((folder) => loadProjects(folder))
        );

        allProjects = results
            .filter((r) => r.status === "fulfilled" && r.value)
            .map((r) => r.value)
            .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
        assignDesignators(allProjects);
        buildFilters(allProjects);
        render();    
    } catch (err) {
        console.error("No se pudo iniciar el feed:", err);
        loadErrorEl.hidden = false;
    }
}

async function loadProjects(folder) {
    const base = `projects/${folder}/`;
    const data = await fetchJSON(base + "project.json");
    return {
        ...data,
        categoria: (data.categoria || "proyectos").toLowerCase(),
        miniatura: data.miniatura ? base + data.miniatura : DEFAULT_THUMB,
        avatar: data.avatar ? base + data.avatar : DEFAULT_AVATAR,
    };
}

async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-cache"});
    if (!res.ok) throw new Error(`No se puede leer ${url} (${res.status})`);
    return res.json();
}

function assignDesignators(projects) {
    const counters = {};
    projects.forEach((p) => {
        counters[p.categoria] = (counters[p.categoria] || 0) + 1;
        const letter = CATEGORY_LETTER[p.categoria] || p.categoria.charAt(0).toUpperCase();
        p._designator = `${letter}-${String(counters[p.categoria]).padStart(2, "0")}`;
    });
}

function buildFilters(projects) {
    const categories = [...new Set(projects.map((p) => p.categoria))];

    const makeButton = (value, label) => {
        const btn = document.createElement("button");
        btn.className = "pin";
        btn.type = "button";
        btn.textContent = label;
        btn.setAttribute("aria-pressed", value === activeCategory ? "true" : "false");
        btn.addEventListener("click", () => {
            activeCategory = value;
            [...filtersEl.children].forEach((b) =>
                b.setAttribute("aria-pressed", b === btn ? "true" : "false")
            );
            render();
        });
        return btn;
    };

    filtersEl.appendChild(makeButton("todos", "Todos"));
    categories.forEach((cat) => {
        filtersEl.appendChild(makeButton(cat, capitalize(cat)));
    });
}

function render() {
    const visible =
    activeCategory === "todos"
      ? allProjects
      : allProjects.filter((p) => p.categoria === activeCategory);

  feedEl.innerHTML = "";
  emptyStateEl.hidden = visible.length !== 0;

  const fragment = document.createDocumentFragment();
  visible.forEach((p) => fragment.appendChild(renderCard(p)));
  feedEl.appendChild(fragment);
}

function renderCard(p) {
  const isLink = Boolean(p.enlace);
  const card = document.createElement(isLink ? "a" : "div");
  card.className = "card";
  if (isLink) {
    card.href = p.enlace;
    card.rel = "noopener";
  }

  card.innerHTML = `
    <div class="thumb-wrap">
      <img src="${p.miniatura}" alt="" loading="lazy" decoding="async"
           onerror="this.src='${DEFAULT_THUMB}'">
      <span class="designator">${p._designator}</span>
    </div>
    <div class="card-body">
      <img class="avatar" src="${p.avatar}" alt="" loading="lazy" decoding="async"
           onerror="this.src='${DEFAULT_AVATAR}'">
      <div class="card-meta">
        <p class="card-title">${escapeHTML(p.titulo || "Proyecto sin título")}</p>
        <p class="card-author">${escapeHTML(p.autor || "Autor desconocido")}</p>
        <p class="card-tags">${capitalize(p.categoria)}${p.fecha ? " · " + formatDate(p.fecha) : ""}</p>
      </div>
    </div>
  `;
  return card;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}