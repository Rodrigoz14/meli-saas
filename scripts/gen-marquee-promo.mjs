import { chromium } from "playwright";

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet"/>
<style>
  :root {
    --background: #0a0d17;
    --card: #12162a;
    --border: #23283f;
    --foreground: #f4f6fb;
    --muted-foreground: #9aa4c2;
    --primary: #5670f0;
    --secondary: #34cee0;
    --emerald: #10b981;
    --violet: #8b5cf6;
    --amber: #f5a524;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1400px; height: 560px;
    background: var(--background);
    font-family: "Inter", sans-serif;
    color: var(--foreground);
    overflow: hidden;
    position: relative;
  }
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.55;
  }
  .orb-1 { width: 520px; height: 520px; background: var(--primary); top: -180px; left: -120px; }
  .orb-2 { width: 460px; height: 460px; background: var(--secondary); bottom: -200px; right: -80px; opacity: 0.4; }
  .orb-3 { width: 340px; height: 340px; background: var(--violet); bottom: -140px; left: 640px; opacity: 0.28; }

  .wrap {
    position: absolute; inset: 0;
    display: flex; align-items: center;
    padding: 0 72px;
    z-index: 1;
  }
  .left { width: 760px; }
  .brand {
    display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
  }
  .brand-mark {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 28px -6px var(--primary);
  }
  .brand-mark svg { width: 22px; height: 22px; fill: white; }
  .brand-name {
    font-family: "Plus Jakarta Sans", sans-serif;
    font-weight: 800; font-size: 24px; letter-spacing: -0.01em;
  }
  h1 {
    font-family: "Plus Jakarta Sans", sans-serif;
    font-weight: 800; font-size: 46px; line-height: 1.15; letter-spacing: -0.01em;
    max-width: 680px;
  }
  h1 .accent { color: var(--secondary); }
  .sub {
    margin-top: 20px; font-size: 18px; line-height: 1.5; color: var(--muted-foreground);
    max-width: 560px;
  }
  .trust {
    margin-top: 26px; font-size: 14px; color: var(--muted-foreground);
    display: flex; align-items: center; gap: 8px;
  }
  .trust b { color: var(--foreground); font-weight: 600; }
  .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--muted-foreground); }

  .right {
    flex: 1; display: flex; justify-content: center; align-items: center;
  }
  .panel {
    width: 400px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.6);
    transform: rotate(2.5deg);
  }
  .panel-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 18px;
  }
  .panel-header .pill {
    font-size: 11px; font-weight: 700; color: var(--primary);
    background: color-mix(in srgb, var(--primary) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
    border-radius: 999px; padding: 4px 10px;
  }
  .grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .kpi {
    border-radius: 12px; padding: 14px; background: #171c33; border: 1px solid var(--border);
  }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
  .kpi .value { margin-top: 6px; font-family: "Plus Jakarta Sans", sans-serif; font-weight: 800; font-size: 20px; }
  .kpi.g1 .value { color: var(--violet); }
  .kpi.g2 .value { color: var(--emerald); }
  .kpi.g3 .value { color: var(--amber); }
  .kpi.g4 .value { color: var(--secondary); }
  .rows { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .row {
    display: flex; align-items: center; gap: 10px;
    background: #171c33; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px;
  }
  .row .sw { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; }
  .row .bar { height: 6px; border-radius: 4px; flex: 1; background: linear-gradient(90deg, var(--primary), var(--secondary)); opacity: 0.85; }
</style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="wrap">
    <div class="left">
      <div class="brand">
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
        </span>
        <span class="brand-name">MeliBoost</span>
      </div>
      <h1>Rentabilidad <span class="accent">real</span> para vendedores de Mercado Libre</h1>
      <p class="sub">Ventas, márgenes y oportunidades de tus publicaciones, calculados con datos reales — no estimaciones. Todo desde tu navegador.</p>
      <div class="trust"><b>No afiliado a Mercado Libre</b><span class="dot"></span><span>Datos reales, no estimaciones</span></div>
    </div>
    <div class="right">
      <div class="panel">
        <div class="panel-header"><span class="pill">MI NEGOCIO</span></div>
        <div class="grid">
          <div class="kpi g1"><div class="label">Ventas 30d</div><div class="value">$14.2M</div></div>
          <div class="kpi g2"><div class="label">Unidades</div><div class="value">351</div></div>
          <div class="kpi g3"><div class="label">Ads 30d</div><div class="value">$612K</div></div>
          <div class="kpi g4"><div class="label">Publicaciones</div><div class="value">47</div></div>
        </div>
        <div class="rows">
          <div class="row"><span class="sw" style="background:#5670f0"></span><span class="bar" style="width:70%"></span></div>
          <div class="row"><span class="sw" style="background:#34cee0"></span><span class="bar" style="width:52%"></span></div>
          <div class="row"><span class="sw" style="background:#10b981"></span><span class="bar" style="width:38%"></span></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 560 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: "C:/Users/USUARIO/meli-saas/extension/store-assets/marquee-promo-1400x560.png" });
await browser.close();
console.log("Saved marquee-promo-1400x560.png");
