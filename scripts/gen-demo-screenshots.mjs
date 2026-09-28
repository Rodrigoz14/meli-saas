import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = "C:/Users/USUARIO/meli-saas/extension";
const outDir = "C:/Users/USUARIO/meli-saas/extension/store-assets";

// Ícono placeholder genérico (caja/paquete), nunca una foto real de producto.
function placeholderThumb(bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
    <rect width="56" height="56" rx="10" fill="${bg}"/>
    <path d="M16 22 L28 15 L40 22 L40 38 L28 45 L16 38 Z" fill="none" stroke="white" stroke-opacity="0.85" stroke-width="2.2"/>
    <path d="M16 22 L28 29 L40 22 M28 29 L28 45" fill="none" stroke="white" stroke-opacity="0.85" stroke-width="2.2"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const colors = ["#5670f0", "#34cee0", "#10b981", "#8b5cf6", "#f5a524", "#f23d63", "#5670f0", "#34cee0"];

const demoProducts = [
  { title: "Multivitamínico Complejo B x60 Cápsulas", price: 45000, unitsSold30d: 34, revenue30d: 1530000, adsCtr: 3.85, availableQuantity: 120 },
  { title: "Termómetro Digital Infrarrojo Sin Contacto", price: 89000, unitsSold30d: 21, revenue30d: 1869000, adsCtr: 2.1, availableQuantity: 45 },
  { title: "Guantes de Nitrilo Talla M x100 Unidades", price: 32500, unitsSold30d: 58, revenue30d: 1885000, adsCtr: 4.42, availableQuantity: 200 },
  { title: "Alcohol Antiséptico 70% x1000ml", price: 18900, unitsSold30d: 76, revenue30d: 1436400, adsCtr: 1.95, availableQuantity: 310 },
  { title: "Tensiómetro Digital de Brazo Automático", price: 145000, unitsSold30d: 12, revenue30d: 1740000, adsCtr: 5.2, availableQuantity: 18 },
  { title: "Mascarillas Quirúrgicas 3 Capas x50 Unidades", price: 24000, unitsSold30d: 90, revenue30d: 2160000, adsCtr: 3.1, availableQuantity: 500 },
  { title: "Suplemento de Colágeno Hidrolizado x300g", price: 68500, unitsSold30d: 27, revenue30d: 1849500, adsCtr: 4.75, availableQuantity: 65 },
  { title: "Oxímetro de Pulso Digital Portátil", price: 55000, unitsSold30d: 33, revenue30d: 1815000, adsCtr: 6.02, availableQuantity: 40 },
].map((p, i) => ({ ...p, thumbnail: placeholderThumb(colors[i]), currencyId: "COP", permalink: null }));

const dashboardMock = {
  connected: true,
  currencyId: "COP",
  totalRevenue30d: demoProducts.reduce((s, p) => s + p.revenue30d, 0),
  totalUnits30d: demoProducts.reduce((s, p) => s + p.unitsSold30d, 0),
  totalAds30d: 612000,
  totalProducts: 47,
  products: demoProducts,
};

const searchRows = [
  { title: "Vitamina C 1000mg x100 Tabletas Efervescentes", price: 39900, originalPrice: 52000, visits: 18420, estimatedRevenue: 8950000, realSales: 1240, isFull: true, thumbnail: placeholderThumb("#5670f0"), permalink: null },
  { title: "Vitamina C + Zinc Masticable x90 Unidades", price: 27500, originalPrice: null, visits: 12980, estimatedRevenue: 5610000, realSales: 860, isFull: true, thumbnail: placeholderThumb("#34cee0"), permalink: null },
  { title: "Suplemento Vitamina C Liposomal x60 Cápsulas", price: 62000, originalPrice: null, visits: 9540, estimatedRevenue: 4870000, realSales: 410, isFull: false, thumbnail: placeholderThumb("#10b981"), permalink: null },
  { title: "Vitamina C en Polvo Sabor Naranja x200g", price: 34900, originalPrice: 41000, visits: 7610, estimatedRevenue: 3120000, realSales: 305, isFull: true, thumbnail: placeholderThumb("#8b5cf6"), permalink: null },
  { title: "Pack Vitamina C + D3 x120 Tabletas", price: 48500, originalPrice: null, visits: 6120, estimatedRevenue: 2640000, realSales: 198, isFull: false, thumbnail: placeholderThumb("#f5a524"), permalink: null },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.addInitScript((dashboard) => {
  window.__meliboostListeners = [];
  window.chrome = {
    runtime: {
      onMessage: {
        addListener: (fn) => window.__meliboostListeners.push(fn),
      },
      sendMessage: async (msg) => {
        if (msg?.type === "MELIBOOST_GET_DASHBOARD") return dashboard;
        return {};
      },
    },
    tabs: { create: () => {} },
  };
}, dashboardMock);

await page.goto(`file:///${extDir}/popup.html`);
await page.waitForSelector("#negocio-content:not([hidden])", { timeout: 5000 });
await page.screenshot({ path: `${outDir}/screenshot-1-mi-negocio-demo.png` });
console.log("Saved screenshot-1-mi-negocio-demo.png");

// ---- Tab 2: Búsqueda de Productos, con resultados demo ----
await page.click("#tab-btn-busqueda");
await page.fill("#query", "vitamina c");
await page.evaluate((rows) => {
  window.__meliboostListeners.forEach((fn) =>
    fn({ type: "MELIBOOST_SEARCH_RESULT", ok: true, rows, isTrending: true, trendingKeyword: "vitamina c" }),
  );
}, searchRows);
await page.waitForSelector("#table-wrap[style*='block']", { timeout: 5000 });
await page.screenshot({ path: `${outDir}/screenshot-2-busqueda-demo.png` });
console.log("Saved screenshot-2-busqueda-demo.png");

await browser.close();
