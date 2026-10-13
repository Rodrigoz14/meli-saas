// UI del side panel de la extensión. Tiene dos pestañas:
// - "Mi Negocio": datos reales del propietario (pide conexión con Mercado
//   Libre si todavía no hay una pestaña de MeliBoost logueada; una vez
//   conectado, trae los mismos datos reales que ya calcula Rentabilidad).
// - "Búsqueda de Productos": la búsqueda real de nichos que ya existía,
//   usando el mismo scraping de background.js — sin cambios de lógica.
//
// Este archivo solo renderiza: los mensajes MELIBOOST_*, checkConnection y
// chrome.tabs.create se mantienen tal cual.

// ---------- Tema ----------
const themeBtn = document.getElementById("btn-theme");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}

chrome.storage?.local?.get?.("theme").then((res) => applyTheme(res?.theme ?? "dark")).catch(() => {});

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  chrome.storage?.local?.set?.({ theme: next });
});

// ---------- Toast ----------
const toastEl = document.getElementById("toast");
let toastTimer = null;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function openListing(url) {
  toast("Abriendo publicación…");
  chrome.tabs.create({ url });
}

// ---------- Tabs ----------
const tabsEl = document.getElementById("tabs");
const tabBtnNegocio = document.getElementById("tab-btn-negocio");
const tabBtnBusqueda = document.getElementById("tab-btn-busqueda");
const viewNegocio = document.getElementById("view-negocio");
const viewBusqueda = document.getElementById("view-busqueda");

function activateTab(name) {
  const isNegocio = name === "negocio";
  tabsEl.dataset.active = isNegocio ? "negocio" : "busqueda";
  tabBtnNegocio.classList.toggle("active", isNegocio);
  tabBtnBusqueda.classList.toggle("active", !isNegocio);
  viewNegocio.hidden = !isNegocio;
  viewBusqueda.hidden = isNegocio;
}

tabBtnNegocio.addEventListener("click", () => activateTab("negocio"));
tabBtnBusqueda.addEventListener("click", () => activateTab("busqueda"));

document.getElementById("btn-open-app").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "MELIBOOST_OPEN_APP" });
});

// ---------- Mi Negocio ----------
const negocioLoadingEl = document.getElementById("negocio-loading");
const negocioConnectEl = document.getElementById("negocio-connect");
const negocioErrorEl = document.getElementById("negocio-error");
const negocioContentEl = document.getElementById("negocio-content");
const negocioRowsEl = document.getElementById("negocio-rows");
const btnConnect = document.getElementById("btn-connect");
const btnRecheck = document.getElementById("btn-recheck");
const btnRefresh = document.getElementById("btn-refresh");

// Mismo formato que la app: "$96.796.400" (sin sufijo de moneda) y signo
// menos real en los negativos.
function money(value, currencyId) {
  const rounded = Math.round(Math.abs(value || 0));
  let body;
  try {
    body = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyId || "COP",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    body = `$${rounded.toLocaleString("es-CO")}`;
  }
  body = body.replace(/ /g, "");
  return value < 0 ? `−${body}` : body;
}

function num(value) {
  return Math.round(value || 0).toLocaleString("es-CO");
}

function showNegocioView(view) {
  negocioLoadingEl.hidden = view !== "loading";
  negocioConnectEl.hidden = view !== "connect";
  negocioErrorEl.hidden = view !== "error";
  negocioContentEl.hidden = view !== "content";
}

let negocioData = null;
let negocioSortKey = "revenue30d";
let negocioSortDir = "desc";

function renderNegocioList() {
  if (!negocioData) return;
  const products = [...(negocioData.products || [])];
  const maxRevenue = products.reduce((max, p) => Math.max(max, p.revenue30d || 0), 0);

  products.sort((a, b) => {
    const va = a[negocioSortKey] ?? -1;
    const vb = b[negocioSortKey] ?? -1;
    return negocioSortDir === "desc" ? vb - va : va - vb;
  });

  negocioRowsEl.innerHTML = "";
  products.forEach((p, index) => {
    const share = maxRevenue > 0 ? Math.max(((p.revenue30d || 0) / maxRevenue) * 100, 2) : 0;
    const ctrHtml =
      p.adsCtr !== null && p.adsCtr !== undefined
        ? `<span class="ctr-badge">CTR ${p.adsCtr.toFixed(2).replace(".", ",")}%</span>`
        : `<span>CTR —</span>`;
    const stockHtml =
      p.availableQuantity === 0
        ? `<span class="right stock-out">Sin stock</span>`
        : p.availableQuantity < 25
          ? `<span class="right stock-low">${num(p.availableQuantity)} en stock</span>`
          : `<span class="right">${num(p.availableQuantity)} en stock</span>`;

    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <div class="thumb-wrap">
        ${p.thumbnail ? `<img class="thumb" src="${p.thumbnail}" alt="" />` : `<div class="thumb"></div>`}
        <span class="rank">${index + 1}</span>
      </div>
      <div class="body">
        <div class="top-row">
          <div class="title">${escapeHtml(p.title)}</div>
          <div class="amount num">${money(p.revenue30d, p.currencyId)}</div>
        </div>
        <div class="share-bar"><span style="width: ${share}%"></span></div>
        <div class="meta">
          <span class="num">${money(p.price, p.currencyId)}</span>
          <span class="num">${num(p.unitsSold30d)} vtas</span>
          ${ctrHtml}
          ${stockHtml}
        </div>
      </div>
    `;
    if (p.permalink) {
      card.title = "Abrir publicación";
      card.addEventListener("click", () => openListing(p.permalink));
    } else {
      card.style.cursor = "default";
    }
    negocioRowsEl.appendChild(card);
  });

  document.querySelectorAll("#negocio-sort .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.nsort === negocioSortKey);
  });
}

function renderNegocio(data) {
  negocioData = data;
  document.getElementById("n-kpi-revenue").textContent = money(data.totalRevenue30d, data.currencyId);
  document.getElementById("n-kpi-sub").textContent =
    `${num(data.totalUnits30d)} unidades · ${num(data.totalProducts)} publicaciones activas`;
  document.getElementById("n-kpi-units").textContent = num(data.totalUnits30d);
  document.getElementById("n-kpi-ads").textContent = money(data.totalAds30d || 0, data.currencyId);
  document.getElementById("n-kpi-count").textContent = num(data.totalProducts);
  renderNegocioList();
}

document.querySelectorAll("#negocio-sort .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.nsort;
    if (key === negocioSortKey) {
      negocioSortDir = negocioSortDir === "desc" ? "asc" : "desc";
    } else {
      negocioSortKey = key;
      negocioSortDir = "desc";
    }
    renderNegocioList();
  });
});

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

// ---------- Búsqueda de Productos ----------
const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const siteSelect = document.getElementById("site");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const kpisEl = document.getElementById("kpis");
const summaryEl = document.getElementById("search-summary");
const sortChipsEl = document.getElementById("search-sort");
const emptyStateEl = document.getElementById("empty-state");
const tableWrapEl = document.getElementById("table-wrap");
const rowsEl = document.getElementById("rows");

let currentRows = [];
let sortKey = "visits";
let sortDir = "desc";
let currentTrending = { isTrending: false, trendingKeyword: null };
const trendingBannerEl = document.getElementById("trending-banner");

function setBusy(busy, label) {
  submitBtn.disabled = busy;
  statusEl.innerHTML = busy
    ? `<div class="progress-card"><div class="loading-row"><span class="spinner"></span>${escapeHtml(
        label || "Analizando…",
      )}</div><div class="progress-track"><span style="width: 60%"></span></div></div>`
    : "";
}

function showError(message) {
  errorEl.textContent = message || "";
  errorEl.hidden = !message;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function render() {
  if (currentRows.length === 0) {
    kpisEl.hidden = true;
    summaryEl.hidden = true;
    sortChipsEl.hidden = true;
    tableWrapEl.hidden = true;
    trendingBannerEl.hidden = true;
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;
  kpisEl.hidden = false;
  summaryEl.hidden = false;
  sortChipsEl.hidden = false;
  tableWrapEl.hidden = false;

  if (currentTrending.isTrending) {
    trendingBannerEl.innerHTML = `<span>🔥</span><span><b>Tendencia real</b> · «${escapeHtml(
      currentTrending.trendingKeyword,
    )}» está en la lista oficial de esta semana.</span>`;
    trendingBannerEl.hidden = false;
  } else {
    trendingBannerEl.hidden = true;
  }

  const totalVisits = currentRows.reduce((sum, r) => sum + r.visits, 0);
  const totalRevenue = currentRows.reduce((sum, r) => sum + r.estimatedRevenue, 0);
  const maxVisits = currentRows.reduce((max, r) => Math.max(max, r.visits), 0);
  const maxRevenue = currentRows.reduce((max, r) => Math.max(max, r.estimatedRevenue), 0);

  document.getElementById("kpi-visits").textContent = num(totalVisits);
  document.getElementById("kpi-revenue").textContent = money(totalRevenue);
  document.getElementById("kpi-count").textContent = num(currentRows.length);
  document.getElementById("kpi-full").textContent = num(currentRows.filter((r) => r.isFull).length);
  document.getElementById("kpi-median").textContent = money(median(currentRows.map((r) => r.price)));

  const sorted = [...currentRows].sort((a, b) => {
    const va = sortKey === "title" ? a.title.toLowerCase() : a[sortKey];
    const vb = sortKey === "title" ? b.title.toLowerCase() : b[sortKey];
    const diff = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return sortDir === "desc" ? -diff : diff;
  });

  rowsEl.innerHTML = "";
  sorted.forEach((row) => {
    const visitsPct = maxVisits > 0 ? Math.max((row.visits / maxVisits) * 100, 2) : 0;
    const revenuePct = maxRevenue > 0 ? Math.max((row.estimatedRevenue / maxRevenue) * 100, 2) : 0;

    const priceHtml = row.originalPrice
      ? `<span class="price-now num">${money(row.price)}</span> <span class="price-old num">${money(
          row.originalPrice,
        )}</span>`
      : `<span class="amount num">${money(row.price)}</span>`;

    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <div class="thumb-wrap">
        ${row.thumbnail ? `<img class="thumb" src="${row.thumbnail}" alt="" />` : `<div class="thumb"></div>`}
      </div>
      <div class="body">
        <div class="title">${escapeHtml(row.title)}</div>
        <div class="meta" style="margin-top: 6px">
          ${priceHtml}
          ${row.isFull ? `<span class="full-badge">⚡ Full</span>` : ""}
        </div>
        <div class="bars">
          <div>
            <div class="bar-label">Visitas <b class="num">${num(row.visits)}</b></div>
            <div class="bar-track"><span style="width: ${visitsPct}%; background: var(--pri)"></span></div>
          </div>
          <div>
            <div class="bar-label">Fact. est. <b class="num">${money(row.estimatedRevenue)}</b></div>
            <div class="bar-track"><span style="width: ${revenuePct}%; background: var(--sec)"></span></div>
          </div>
        </div>
        ${
          row.realSales != null
            ? `<div class="real-sales" title="Ventas históricas acumuladas reales de Mercado Libre (no de los últimos 30 días)">✓ +${num(
                row.realSales,
              )} vendidos (histórico)</div>`
            : ""
        }
      </div>
    `;

    if (row.permalink) {
      card.title = "Abrir publicación";
      card.addEventListener("click", () => openListing(row.permalink));
    } else {
      card.style.cursor = "default";
    }

    rowsEl.appendChild(card);
  });

  document.querySelectorAll("#search-sort .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.sort === sortKey);
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

document.querySelectorAll("#search-sort .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.sort;
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
    currentTrending = {
      isTrending: Boolean(message.isTrending),
      trendingKeyword: message.trendingKeyword ?? null,
    };
    render();
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  showError(null);
  currentRows = [];
  currentTrending = { isTrending: false, trendingKeyword: null };
  render();
  setBusy(true, `Analizando "${query}"...`);
  chrome.runtime.sendMessage({ type: "MELIBOOST_START_SEARCH", query, site: siteSelect.value });
});

// ---------- init ----------
render();
checkConnection();
