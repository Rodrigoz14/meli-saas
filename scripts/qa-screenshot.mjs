import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForSelector("text=Maximiza tus");

await page.screenshot({ path: "scripts/out-dark-hero.png" });

await page.evaluate(() =>
  window.scrollTo(0, document.body.scrollHeight * 0.35),
);
await page.screenshot({ path: "scripts/out-dark-features.png" });

await page.evaluate(() =>
  window.scrollTo(0, document.body.scrollHeight * 0.65),
);
await page.screenshot({ path: "scripts/out-dark-pricing.png" });

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.screenshot({ path: "scripts/out-dark-footer.png" });

// Switch to light mode via the mode toggle button
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('button[aria-label="Cambiar a modo claro"]');
await page.waitForTimeout(300);
await page.screenshot({ path: "scripts/out-light-hero.png" });

console.log("ERRORS:", JSON.stringify(errors, null, 2));

await browser.close();
