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
// solo una heurística de texto, no un modelo de IA real).
function buildVariations(query) {
  const words = query.trim().split(/\s+/);
  const variations = [query];
  if (words.length > 1) variations.push(words.slice(0, -1).join(" "));
  variations.push(`${query} nuevo`);
  return [...new Set(variations.map((v) => v.trim()).filter(Boolean))].slice(0, 3);
}

// Se pasa como `func` a chrome.scripting.executeScript, así que corre
// dentro de la página de Mercado Libre — no puede depender de nada de este
// archivo, tiene que ser autocontenida.
function scrapeMeliSearchResults() {
  const results = [];
  const cards = document.querySelectorAll(
    "li.ui-search-layout__item, div.poly-card, div.ui-search-result__wrapper, div.ui-search-result",
  );

  cards.forEach((card) => {
    try {
      const link = card.querySelector(
        "a.poly-component__title, a.ui-search-link, a.ui-search-item__group__element, a[href*='/p/'], a[href*='.mercadolibre.']",
      );
      const titleEl = card.querySelector(
        "h2.poly-component__title, h2.ui-search-item__title, .poly-component__title, .ui-search-item__title",
      );
      const title = (titleEl?.textContent || link?.getAttribute("aria-label") || link?.title || "").trim();
      if (!title) return;

      const priceFractionEl = card.querySelector(".andes-money-amount__fraction");
      const priceDigits = priceFractionEl?.textContent?.replace(/\D/g, "") || "";
      const price = priceDigits ? parseInt(priceDigits, 10) : 0;
      if (!price) return;

      const imgEl = card.querySelector("img");
      const image = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";
      const permalink = link?.href || "";
      const cardText = card.textContent || "";
      const isFull = /\bfull\b/i.test(cardText);
      const isCatalog = /cat[aá]logo/i.test(cardText);

      results.push({ title, price, image, permalink, isFull, isCatalog });
    } catch {
      // un item roto no debe tumbar el resto
    }
  });

  return results;
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function scrapeUrl(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTabLoad(tab.id);
    // Le da tiempo a la app de Mercado Libre (React) de terminar de pintar
    // las tarjetas de resultado antes de leer el DOM.
    await new Promise((r) => setTimeout(r, 2500));
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeMeliSearchResults,
    });
    return result || [];
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
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

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "MELIBOOST_START_SEARCH") return;
  const tabId = sender.tab?.id;
  if (!tabId) return;

  (async () => {
    const site = message.site || "CO";
    const variations = buildVariations(message.query || "");
    const allItems = [];
    let anyVariationSucceeded = false;

    for (const variation of variations) {
      chrome.tabs
        .sendMessage(tabId, { type: "MELIBOOST_SEARCH_PROGRESS", label: `Analizando "${variation}"...` })
        .catch(() => {});
      try {
        const url = buildSearchUrl(site, variation);
        const items = await scrapeUrl(url);
        if (items.length > 0) anyVariationSucceeded = true;
        allItems.push(...items);
      } catch {
        // si una variación falla (ej. Mercado Libre pide login), seguimos con las demás
      }
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

    chrome.tabs
      .sendMessage(tabId, {
        type: "MELIBOOST_SEARCH_RESULT",
        query: message.query,
        ok: anyVariationSucceeded,
        rows,
      })
      .catch(() => {});
  })();
});
