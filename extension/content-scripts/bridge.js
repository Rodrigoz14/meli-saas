// Puente entre la página de MeliBoost (localhost:3000 / meli-saas.vercel.app)
// y el service worker de la extensión. La página no puede llamar la API de
// chrome.runtime directamente (no tiene acceso), así que este content
// script relee window.postMessage de la página y lo reenvía como mensaje de
// extensión, y viceversa.

function announceReady() {
  window.postMessage({ source: "meliboost-extension", type: "MELIBOOST_EXTENSION_READY" }, "*");
}

// Avisamos apenas carga, pero React puede montar su listener un poco
// después (o incluso antes de que este content script corra) — por eso la
// página también puede pedir un "ping" y este script siempre contesta.
announceReady();

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "meliboost-page") return;

  if (data.type === "MELIBOOST_PING") {
    announceReady();
    return;
  }

  if (data.type === "MELIBOOST_START_SEARCH") {
    chrome.runtime.sendMessage(
      { type: "MELIBOOST_START_SEARCH", query: data.query, site: data.site },
      () => {
        // La respuesta real llega async vía chrome.runtime.onMessage abajo,
        // no por este callback (el scraping tarda más que un sendMessage).
      },
    );
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MELIBOOST_SEARCH_RESULT" || message?.type === "MELIBOOST_SEARCH_PROGRESS") {
    window.postMessage({ source: "meliboost-extension", ...message }, "*");
  }
});
