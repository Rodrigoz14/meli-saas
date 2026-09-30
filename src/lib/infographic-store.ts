// Guarda las infografías YA generadas (blobs reales, no URLs) para que
// la pestaña "Publicar" pueda mostrarlas/subirlas sin tener que volver a
// generarlas. sessionStorage no sirve para esto (cada imagen pesa
// ~300KB-1.5MB, las 6 juntas pueden superar fácil su cupo típico de
// 5-10MB) — IndexedDB tiene cupo real (cientos de MB) y está pensado
// para blobs, no solo strings.

const DB_NAME = "meliboost-infographics";
const STORE_NAME = "images";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function keyFor(productId: string, category: string): string {
  return `${productId || "_scratch"}:${category}`;
}

export async function saveGeneratedImages(
  productId: string,
  blobs: Partial<Record<string, Blob>>,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const [category, blob] of Object.entries(blobs)) {
        if (blob) store.put(blob, keyFor(productId, category));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB puede fallar (modo privado, cupo lleno) — no es crítico,
    // el usuario simplemente no va a ver las imágenes precargadas en
    // la pestaña de Publicar.
  }
}

export async function getGeneratedImages<Category extends string>(
  productId: string,
  categories: Category[],
): Promise<Partial<Record<Category, Blob>>> {
  try {
    const db = await openDb();
    const result: Partial<Record<Category, Blob>> = {};
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      let pending = categories.length;
      if (pending === 0) resolve();
      for (const category of categories) {
        const req = store.get(keyFor(productId, category));
        req.onsuccess = () => {
          if (req.result) result[category] = req.result as Blob;
          pending -= 1;
          if (pending === 0) resolve();
        };
        req.onerror = () => {
          pending -= 1;
          if (pending === 0) resolve();
        };
      }
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return result;
  } catch {
    return {};
  }
}
