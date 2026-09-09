// MeliBoost - Investigación de Productos (extensión)
//
// Abre resultados de búsqueda reales de Mercado Libre (usando la sesión ya
// logueada del usuario en su propio navegador — por eso esto tiene que ser
// una extensión y no un fetch de servidor: Mercado Libre exige sesión para
// ver resultados de búsqueda) y extrae título/precio/imagen/link de cada
// publicación. NO existe ninguna forma pública de conocer las visitas
// reales de una publicación ajena (ni siquiera logueado — eso solo lo ve el
// dueño de la cuenta), así que "visitas" y "facturación estimada" son una
// ESTIMACIÓN basada en la posición del resultado, igual que confirmamos que
// hace Selltrix con datos reales de su producto (nunca es una medición real
// para publicaciones de terceros).

// El popup normal de Chrome se cierra apenas otra pestaña toma el foco —
// y una búsqueda cambia de pestaña activa a propósito (ver scrapeUrl), así
// que un popup común se mataría a mitad de camino. El side panel no tiene
// ese problema: queda abierto aunque cambies de pestaña.
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const SITE_DOMAINS = {
  CO: "mercadolibre.com.co",
  AR: "mercadolibre.com.ar",
  MX: "mercadolibre.com.mx",
  BR: "mercadolibre.com.br",
  CL: "mercadolibre.cl",
  PE: "mercadolibre.com.pe",
};

const ASSUMED_CONVERSION_RATE = 0.03;
const RANK_BASELINE_VISITS = 800;

function buildSearchUrl(site, query) {
  const domain = SITE_DOMAINS[site] || SITE_DOMAINS.CO;
  const slug = query.trim().toLowerCase().replace(/\s+/g, "-");
  return `https://listado.${domain}/${encodeURIComponent(slug)}`;
}

// Variaciones simples del término para cubrir más del nicho en una sola
// búsqueda (mismo espíritu que las "Búsquedas IA" de Selltrix, pero acá es
// solo una heurística de texto, no un modelo de IA real — no hay
// ANTHROPIC_API_KEY configurada para generar sinónimos de verdad).
function buildVariations(query) {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);
  const variations = [trimmed];
  if (words.length > 1) variations.push(words.slice(0, -1).join(" ")); // sin la última palabra
  if (words.length > 2) variations.push(words.slice(1).join(" ")); // sin la primera palabra
  variations.push(`${trimmed} nuevo`);
  variations.push(`${trimmed} original`);
  return [...new Set(variations.map((v) => v.trim()).filter(Boolean))].slice(0, 4);
}

// Se pasa como `func` a chrome.scripting.executeScript, así que corre
// dentro de la página de Mercado Libre, inyectada de forma AISLADA — no
// tiene acceso a nada del resto de este archivo (ni funciones ni
// constantes de fuera), Chrome solo serializa el cuerpo de esta función.
// Ese fue justamente el bug que se pasó por alto un buen rato: al sacar
// CARD_SELECTOR/PRICE_SELECTOR/findCardAncestor/extractFromCard como
// declaraciones de nivel superior, quedaban indefinidas dentro de la
// página real, la función fallaba en silencio (la promesa rechazaba sin
// que chrome.scripting.executeScript lo reportara como error) y todo se
// veía igual que "no encontró nada". Por eso TODO tiene que ir adentro.
//
// Es async porque el grid de resultados se pinta con JS del lado del
// cliente — una tarjeta puede tardar unos segundos en aparecer, así que
// reintenta en vez de leer el DOM una sola vez a ciegas.
async function scrapeMeliSearchResults() {
  const CARD_SELECTOR =
    "li.ui-search-layout__item, div.poly-card, div.ui-search-result__wrapper, div.ui-search-result";
  // Los precios son el elemento más estable de Mercado Libre (casi no
  // cambia entre rediseños). Si los selectores de "tarjeta completa" de
  // arriba no coinciden con el HTML actual, esto sirve de red de
  // seguridad: ubicamos cada precio y subimos por sus ancestros hasta
  // encontrar uno que también tenga una imagen y un link — eso es la
  // tarjeta, sin depender de su nombre de clase exacto.
  const PRICE_SELECTOR = ".andes-money-amount__fraction";

  function findCardAncestor(priceEl) {
    let node = priceEl.parentElement;
    for (let i = 0; i < 8 && node; i++) {
      if (node.querySelector("img") && node.querySelector("a")) return node;
      node = node.parentElement;
    }
    return null;
  }

  function extractFromCard(card) {
    const link =
      card.querySelector(
        "a.poly-component__title, a.ui-search-link, a.ui-search-item__group__element, a[href*='/p/'], a[href*='.mercadolibre.']",
      ) || card.querySelector("a");
    const titleEl = card.querySelector(
      "h2.poly-component__title, h2.ui-search-item__title, .poly-component__title, .ui-search-item__title",
    );
    const title = (titleEl?.textContent || link?.getAttribute("aria-label") || link?.title || "").trim();
    if (!title) return null;

    const priceFractionEl = card.querySelector(PRICE_SELECTOR);
    const priceDigits = priceFractionEl?.textContent?.replace(/\D/g, "") || "";
    const price = priceDigits ? parseInt(priceDigits, 10) : 0;
    if (!price) return null;

    const imgEl = card.querySelector("img");
    const image = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";
    const permalink = link?.href || "";
    const cardText = card.textContent || "";
    const isFull = /\bfull\b/i.test(cardText);
    const isCatalog = /cat[aá]logo/i.test(cardText);

    return { title, price, image, permalink, isFull, isCatalog };
  }

  // Preferimos que la búsqueda tarde (hasta ~1 minuto en total está bien)
  // a que falle por apurarse — con el keep-alive del service worker ya no
  // hay presión de tiempo real.
  const maxWaitMs = 18000;
  const stepMs = 300;
  let elapsed = 0;
  while (
    document.querySelectorAll(CARD_SELECTOR).length === 0 &&
    document.querySelectorAll(PRICE_SELECTOR).length === 0 &&
    elapsed < maxWaitMs
  ) {
    await new Promise((r) => setTimeout(r, stepMs));
    elapsed += stepMs;
  }

  let cards = [...document.querySelectorAll(CARD_SELECTOR)];

  if (cards.length === 0) {
    // Selectores de tarjeta desactualizados: reconstruimos las tarjetas a
    // partir de cada precio encontrado en la página.
    const priceEls = [...document.querySelectorAll(PRICE_SELECTOR)];
    const seen = new Set();
    cards = priceEls
      .map((p) => findCardAncestor(p))
      .filter((c) => {
        if (!c || seen.has(c)) return false;
        seen.add(c);
        return true;
      });
  }

  const results = [];
  for (const card of cards) {
    try {
      const item = extractFromCard(card);
      if (item) results.push(item);
    } catch {
      // un item roto no debe tumbar el resto
    }
  }

  // Diagnóstico: si no encontramos nada, esto ayuda a saber por qué (¿la
  // página no cargó?, ¿está todo en un iframe?, ¿hay precios pero no
  // coinciden con nuestra forma de armar la tarjeta?) sin depender de
  // atrapar la pestaña en vivo, que se cierra antes de poder inspeccionarla.
  const diagnostics = {
    url: location.href,
    title: document.title,
    elapsedWaitMs: elapsed,
    cardSelectorCount: document.querySelectorAll(CARD_SELECTOR).length,
    priceSelectorCount: document.querySelectorAll(PRICE_SELECTOR).length,
    iframeCount: document.querySelectorAll("iframe").length,
    totalElements: document.querySelectorAll("*").length,
    resultsExtracted: results.length,
    bodyTextSnippet: document.body.innerText.slice(0, 200),
  };

  return { results, diagnostics };
}

// Sin límite de tiempo, esto podía quedarse esperando el evento "complete"
// para siempre si por lo que sea nunca llega — colgando toda la búsqueda
// sin ningún error posible de registrar. Ahora se rinde a los 20s.
function waitForTabLoad(tabId, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve();
    }
    function listener(id, info) {
      if (id === tabId && info.status === "complete") finish();
    }
    chrome.tabs.onUpdated.addListener(listener);
    const timer = setTimeout(finish, timeoutMs);
  });
}

async function scrapeUrl(url) {
  // Tiene que abrirse en primer plano (active: true): confirmamos que
  // Mercado Libre no pinta la cuadrícula de resultados en pestañas de
  // fondo (probablemente para no gastar ciclos de render en algo que el
  // usuario no está viendo) — con active:false el título de la pestaña
  // carga bien pero el grid se queda vacío para siempre.
  let tab;
  try {
    tab = await chrome.tabs.create({ url, active: true });
  } catch (err) {
    await logDebug({ stage: "tabs.create", url, error: String(err?.message || err) });
    return [];
  }
  try {
    await logDebug({ stage: "tab-created", url, tabId: tab.id });
    await waitForTabLoad(tab.id);
    await logDebug({ stage: "tab-load-done-or-timeout", url, tabId: tab.id });
    // scrapeMeliSearchResults ya espera (con reintentos) a que aparezcan
    // tarjetas, así que solo hace falta un margen chico para que el resto
    // de la página termine de asentarse antes de inyectar el script.
    await new Promise((r) => setTimeout(r, 500));

    try {
      const currentTab = await chrome.tabs.get(tab.id);
      await logDebug({
        stage: "pre-inject-tab-state",
        requestedUrl: url,
        currentUrl: currentTab.url,
        status: currentTab.status,
        discarded: currentTab.discarded,
      });
    } catch (err) {
      await logDebug({ stage: "pre-inject-tabs.get-failed", url, error: String(err?.message || err) });
    }

    let executionResult;
    try {
      executionResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeMeliSearchResults,
      });
    } catch (err) {
      await logDebug({ stage: "executeScript", url, error: String(err?.message || err) });
      return [];
    }
    await logDebug({
      stage: "raw-executeScript-result",
      url,
      resultLength: executionResult?.length,
      firstFrameKeys: executionResult?.[0] ? Object.keys(executionResult[0]) : null,
    });
    const frame = (executionResult || [])[0] || {};
    if (frame.error) {
      // chrome.scripting.executeScript no rechaza la promesa cuando la
      // función inyectada lanza una excepción — la mete en `frame.error` y
      // deja `frame.result` undefined. Sin este chequeo, esto se veía
      // exactamente igual que "no encontró nada", pero en realidad la
      // función se estaba cayendo antes de terminar de leer la página.
      await logDebug({ stage: "injected-function-threw", url, error: JSON.stringify(frame.error) });
      return [];
    }
    await logDebug({ stage: "executeScript-done", url, hasResult: Boolean(frame.result) });
    const { results, diagnostics } = frame.result || { results: [], diagnostics: null };
    if (diagnostics) await logDebug(diagnostics);
    return results || [];
  } catch (err) {
    await logDebug({ stage: "scrapeUrl-outer", url, error: String(err?.message || err) });
    return [];
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// El guardado de diagnóstico es solo para depurar mientras arreglamos el
// scraper real — si falla (permiso no otorgado, cuota, etc.) nunca debe
// afectar el resultado real de la búsqueda.
async function logDebug(entry) {
  try {
    const { lastScrapeDebug = [] } = await chrome.storage.local.get("lastScrapeDebug");
    const updated = [{ ...entry, loggedAt: Date.now() }, ...lastScrapeDebug].slice(0, 40);
    await chrome.storage.local.set({ lastScrapeDebug: updated });
  } catch {
    // ignorar errores de diagnóstico
  }
}

function dedupeByPermalink(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.permalink || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// El popup y el content-script bridge de la página necesitan cada uno un
// mecanismo de entrega distinto: chrome.runtime.sendMessage llega al popup
// (y a otras páginas de la extensión), pero un content-script SOLO recibe
// mensajes del background vía chrome.tabs.sendMessage(tabId, ...) — un
// broadcast genérico nunca le llega. Por eso mandamos por los dos caminos.
const APP_URL_PATTERNS = ["http://localhost:3000/*", "https://meli-saas.vercel.app/*"];

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
  chrome.tabs.query({ url: APP_URL_PATTERNS }).then((tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

// Un service worker de Manifest V3 se mata solo si Chrome no ve actividad
// de sus APIs por ~30s — y buscar 4 variaciones (cada una abriendo una
// pestaña real y esperando que cargue) tranquilamente suma más que eso.
// Sin esto, la búsqueda se corta a la mitad SIN ningún error posible de
// capturar: el worker completo desaparece. Repetir una llamada liviana a
// una API de la extensión cada 15s (bien por debajo del límite de 30s)
// evita que Chrome lo de por inactivo mientras dura la búsqueda.
function startKeepAlive() {
  const id = setInterval(() => {
    chrome.storage.local.get("__keepalive").catch(() => {});
  }, 15000);
  return () => clearInterval(id);
}

async function runNicheSearch(query, site) {
  const stopKeepAlive = startKeepAlive();
  try {
    await runNicheSearchInner(query, site);
  } finally {
    stopKeepAlive();
  }
}

async function runNicheSearchInner(query, site) {
  // Como cada búsqueda ahora sí cambia de pestaña activa (ver scrapeUrl),
  // guardamos cuál era la pestaña activa antes de empezar para devolverle
  // el foco al usuario cuando terminemos.
  const [previousActiveTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);

  const variations = buildVariations(query || "");
  const allItems = [];
  let anyVariationSucceeded = false;

  for (const variation of variations) {
    broadcast({ type: "MELIBOOST_SEARCH_PROGRESS", label: `Analizando "${variation}"...` });
    try {
      const url = buildSearchUrl(site, variation);
      const items = await scrapeUrl(url);
      if (items.length > 0) anyVariationSucceeded = true;
      allItems.push(...items);
    } catch {
      // si una variación falla (ej. Mercado Libre pide login), seguimos con las demás
    }
  }

  if (previousActiveTab?.id) {
    chrome.tabs.update(previousActiveTab.id, { active: true }).catch(() => {});
  }

  const dedupedItems = dedupeByPermalink(allItems);

  const rows = dedupedItems.map((item, i) => {
    const rank = i + 1;
    const estimatedVisits = Math.max(3, Math.round(RANK_BASELINE_VISITS / Math.sqrt(rank)));
    return {
      id: `real-${i}`,
      title: item.title,
      price: item.price,
      visits: estimatedVisits,
      estimatedRevenue: Math.round(item.price * estimatedVisits * ASSUMED_CONVERSION_RATE),
      isFull: item.isFull,
      isCatalog: item.isCatalog,
      origin: "Local",
      seller: "",
      thumbnail: item.image || null,
      permalink: item.permalink || null,
    };
  });

  broadcast({ type: "MELIBOOST_SEARCH_RESULT", query, ok: anyVariationSucceeded, rows });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "MELIBOOST_START_SEARCH") return;
  logDebug({ stage: "message-received", query: message.query, site: message.site });
  runNicheSearch(message.query, message.site || "CO").catch((err) => {
    logDebug({ stage: "runNicheSearch-uncaught", error: String(err?.message || err) });
  });
});
