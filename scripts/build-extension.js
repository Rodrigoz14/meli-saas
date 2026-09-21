/* eslint-disable @typescript-eslint/no-require-imports */
// Genera la versión de la extensión lista para subir a la Chrome Web
// Store: copia extension/ a extension-dist/, pero sacando localhost:3000
// del manifest (host_permissions y content_scripts) — esa URL es solo para
// desarrollo local, no debe ir en el paquete público. Al final la comprime
// en un .zip con Compress-Archive (nativo de Windows, sin agregar
// dependencias nuevas al proyecto).
// Script plano de Node (CommonJS) corrido directo con `node`, no pasa por
// el bundler de Next — por eso usa require() en vez de import.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "extension");
const DIST_DIR = path.join(ROOT, "extension-dist");
const ZIP_PATH = path.join(ROOT, "extension-dist.zip");

const DEV_ONLY_URLS = ["http://localhost:3000/*"];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
  if (fs.existsSync(ZIP_PATH)) fs.rmSync(ZIP_PATH, { force: true });

  copyRecursive(SRC_DIR, DIST_DIR);

  const manifestPath = path.join(DIST_DIR, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const beforeHostCount = manifest.host_permissions.length;
  manifest.host_permissions = manifest.host_permissions.filter((url) => !DEV_ONLY_URLS.includes(url));

  for (const script of manifest.content_scripts || []) {
    script.matches = script.matches.filter((url) => !DEV_ONLY_URLS.includes(url));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `manifest.json: se sacaron ${beforeHostCount - manifest.host_permissions.length} URL(s) de desarrollo de host_permissions`,
  );

  try {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${DIST_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`,
      { stdio: "inherit" },
    );
    console.log(`\nListo: ${ZIP_PATH}`);
    console.log("Subí ese .zip directamente al Chrome Web Store Developer Dashboard.");
  } catch {
    console.error("No se pudo comprimir automáticamente, pero la carpeta ya está lista en:", DIST_DIR);
    console.error("Comprimila a mano (clic derecho -> Enviar a -> Carpeta comprimida) y subí ese .zip.");
  }
}

main();
