// UI del side panel de la extensión. Tiene dos pestañas:
// - "Mi Negocio": datos reales del propietario (pide conexión con Mercado
//   Libre si todavía no hay una pestaña de MeliBoost logueada; una vez
//   conectado, trae los mismos datos reales que ya calcula Rentabilidad).
// - "Búsqueda de Productos": la búsqueda real de nichos que ya existía,
//   usando el mismo scraping de background.js — sin cambios de lógica.

// ---------- Tabs ----------
const tabBtnNegocio = document.getElementById("tab-btn-negocio");
const tabBtnBusqueda = document.getElementById("tab-btn-busqueda");
const viewNegocio = document.getElementById("view-negocio");
const viewBusqueda = document.getElementById("view-busqueda");

function activateTab(name) {
  const isNegocio = name === "negocio";
  tabBtnNegocio.classList.toggle("active", isNegocio);
  tabBtnBusqueda.classList.toggle("active", !isNegocio);
  viewNegocio.hidden = !isNegocio;
  viewBusqueda.hidden = isNegocio;
}

tabBtnNegocio.addEventListener("click", () => activateTab("negocio"));
tabBtnBusqueda.addEventListener("click", () => activateTab("busqueda"));

// ---------- Mi Negocio ----------
const negocioLoadingEl = document.getElementById("negocio-loading");
const negocioConnectEl = document.getElementById("negocio-connect");
const negocioErrorEl = document.getElementById("negocio-error");
const negocioContentEl = document.getElementById("negocio-content");
const negocioRowsEl = document.getElementById("negocio-rows");
const btnConnect = document.getElementById("btn-connect");
const btnRecheck = document.getElementById("btn-recheck");
const btnRefresh = document.getElementById("btn-refresh");

function money(value, currencyId) {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyId || "COP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString("es-CO")}`;
  }
}

function showNegocioView(view) {
  negocioLoadingEl.hidden = view !== "loading";
  negocioConnectEl.hidden = view !== "connect";
  negocioErrorEl.hidden = view !== "error";
  negocioContentEl.hidden = view !== "content";
}

function renderNegocio(data) {
  document.getElementById("n-kpi-revenue").textContent = money(data.totalRevenue30d, data.currencyId);
  document.getElementById("n-kpi-units").textContent = data.totalUnits30d.toLocaleString("es");
  document.getElementById("n-kpi-ads").textContent = money(data.totalAds30d || 0, data.currencyId);
  document.getElementById("n-kpi-count").textContent = data.totalProducts;

  negocioRowsEl.innerHTML = "";
  (data.products || []).forEach((p) => {
    const tr = document.createElement("tr");
    const thumbHtml = p.thumbnail ? `<img class="thumb" src="${p.thumbnail}" alt="" />` : `<div class="thumb"></div>`;
    const ctrHtml =
      p.adsCtr !== null && p.adsCtr !== undefined
        ? `<span class="ctr-badge">${p.adsCtr.toFixed(2)}%</span>`
        : `<span style="color: var(--muted-foreground)">—</span>`;

    tr.innerHTML = `
      <td>${thumbHtml}</td>
      <td class="title-cell" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</td>
      <td>${money(p.price, p.currencyId)}</td>
      <td>${p.unitsSold30d}</td>
      <td>${money(p.revenue30d, p.currencyId)}</td>
      <td>${ctrHtml}</td>
      <td>${p.availableQuantity}</td>
    `;
    if (p.permalink) {
      tr.style.cursor = "pointer";
      tr.title = "Abrir publicación";
      tr.addEventListener("click", () => chrome.tabs.create({ url: p.permalink }));
    }
    negocioRowsEl.appendChild(tr);
  });
}

async function checkConnection() {
  showNegocioView("loading");
  let data;
  try {
    data = await chrome.runtime.sendMessage({ type: "MELIBOOST_GET_DASHBOARD" });
  } catch (err) {
    data = { connected: false, reason: "message-failed", error: String(err) };
  }

  if (!data || !data.connected) {
    const reason = data?.reason;
    const textEl = document.getElementById("connect-text");
    if (reason === "no-tab") {
      textEl.textContent =
        "Para ver los datos reales de tus productos (ventas, stock, CTR de Ads) necesitamos que conectes tu cuenta desde MeliBoost.";
    } else if (reason === "tab-not-responding") {
      textEl.textContent =
        "Encontramos una pestaña de MeliBoost abierta pero no logramos conectarnos con ella. Recargá esa pestaña (F5) y volvé a intentar.";
    } else if (reason === "no-meli") {
      textEl.textContent =
        "Ya iniciaste sesión en MeliBoost, pero todavía no conectaste tu cuenta de Mercado Libre. Termina la conexión y volvé a intentar.";
    } else if (reason === "no-session") {
      textEl.textContent = "Iniciá sesión en MeliBoost y conectá tu cuenta de Mercado Libre para ver tus datos reales aquí.";
    } else {
      textEl.textContent = "No pudimos comprobar tu conexión. Abrí MeliBoost e intentá de nuevo.";
    }
    showNegocioView("connect");
    return;
  }

  if (data.error) {
    negocioErrorEl.textContent = data.error;
    showNegocioView("error");
    return;
  }

  renderNegocio(data);
  showNegocioView("content");
}

btnConnect.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MELIBOOST_OPEN_APP" });
  btnConnect.disabled = true;
  btnConnect.textContent = "Abriendo MeliBoost…";
  setTimeout(() => {
    btnConnect.disabled = false;
    btnConnect.textContent = "Conectar con Mercado Libre";
    checkConnection();
  }, 4000);
});

btnRecheck.addEventListener("click", checkConnection);
btnRefresh.addEventListener("click", checkConnection);

// ---------- Búsqueda de Productos (igual que antes) ----------
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

function setBusy(busy, label) {
  submitBtn.disabled = busy;
  statusEl.innerHTML = busy ? `<span class="spinner"></span>${label || "Analizando…"}` : "";
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
  kpisEl.style.display = "grid";
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
  sorted.forEach((row) => {
    const tr = document.createElement("tr");

    const thumbHtml = row.thumbnail
      ? `<img class="thumb" src="${row.thumbnail}" alt="" />`
      : `<div class="thumb"></div>`;

    tr.innerHTML = `
      <td>${thumbHtml}</td>
      <td class="title-cell" title="${escapeHtml(row.title)}">${escapeHtml(row.title)}${row.isFull ? ' <span class="full-badge">⚡Full</span>' : ""}</td>
      <td>${money(row.price)}</td>
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

// ---------- init ----------
render();
checkConnection();
