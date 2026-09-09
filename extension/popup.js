// UI propia de la extensión (el popup que se abre al hacer clic en el
// ícono) — usa exactamente la misma búsqueda real de background.js que
// alimenta al dashboard de MeliBoost, así que funciona igual sin depender
// de tener la página de MeliBoost abierta.

const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const siteSelect = document.getElementById("site");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const kpisEl = document.getElementById("kpis");
const emptyStateEl = document.getElementById("empty-state");
const tableWrapEl = document.getElementById("table-wrap");
const rowsEl = document.getElementById("rows");

let currentRows = [];
let sortKey = "visits";
let sortDir = "desc";

function money(value) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function setBusy(busy, label) {
  submitBtn.disabled = busy;
  statusEl.textContent = busy ? label || "Analizando…" : "";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = message ? "block" : "none";
}

function render() {
  if (currentRows.length === 0) {
    kpisEl.style.display = "none";
    tableWrapEl.style.display = "none";
    emptyStateEl.style.display = "block";
    return;
  }

  emptyStateEl.style.display = "none";
  kpisEl.style.display = "flex";
  tableWrapEl.style.display = "block";

  const totalVisits = currentRows.reduce((sum, r) => sum + r.visits, 0);
  const totalRevenue = currentRows.reduce((sum, r) => sum + r.estimatedRevenue, 0);
  document.getElementById("kpi-visits").textContent = totalVisits.toLocaleString("es");
  document.getElementById("kpi-revenue").textContent = money(totalRevenue);
  document.getElementById("kpi-count").textContent = currentRows.length;

  const sorted = [...currentRows].sort((a, b) => {
    const va = sortKey === "title" ? a.title.toLowerCase() : a[sortKey];
    const vb = sortKey === "title" ? b.title.toLowerCase() : b[sortKey];
    const diff = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return sortDir === "desc" ? -diff : diff;
  });

  rowsEl.innerHTML = "";
  sorted.forEach((row, i) => {
    const tr = document.createElement("tr");

    const thumbHtml = row.thumbnail
      ? `<img class="thumb" src="${row.thumbnail}" alt="" />`
      : `<div class="thumb"></div>`;

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${thumbHtml}</td>
      <td class="title-cell" title="${escapeHtml(row.title)}">${escapeHtml(row.title)}</td>
      <td>${money(row.price)}</td>
      <td>${row.isFull ? '<span class="full-badge">⚡ Full</span>' : "—"}</td>
      <td>${row.visits.toLocaleString("es")}</td>
      <td>${money(row.estimatedRevenue)}</td>
    `;

    if (row.permalink) {
      tr.style.cursor = "pointer";
      tr.title = "Abrir publicación";
      tr.addEventListener("click", () => chrome.tabs.create({ url: row.permalink }));
    }

    rowsEl.appendChild(tr);
  });

  document.querySelectorAll("thead th[data-sort]").forEach((th) => {
    th.classList.toggle("active", th.dataset.sort === sortKey);
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

document.querySelectorAll("thead th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (key === sortKey) {
      sortDir = sortDir === "desc" ? "asc" : "desc";
    } else {
      sortKey = key;
      sortDir = "desc";
    }
    render();
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MELIBOOST_SEARCH_PROGRESS") {
    setBusy(true, message.label);
  }
  if (message?.type === "MELIBOOST_SEARCH_RESULT") {
    setBusy(false);
    if (!message.ok || (message.rows || []).length === 0) {
      showError(
        "No pudimos leer resultados de Mercado Libre. Verifica que tengas sesión iniciada en mercadolibre.com e intenta de nuevo.",
      );
      currentRows = [];
      render();
      return;
    }
    showError(null);
    currentRows = message.rows;
    render();
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  showError(null);
  currentRows = [];
  render();
  setBusy(true, `Analizando "${query}"...`);
  chrome.runtime.sendMessage({ type: "MELIBOOST_START_SEARCH", query, site: siteSelect.value });
});

render();
