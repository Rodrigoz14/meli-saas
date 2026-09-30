import type { InfographicSetCategory } from "@/lib/ai";

// Antes vivía solo dentro de infographic-set-generator.tsx — ahora
// también lo necesita la pestaña "Publicar" para mostrar/subir las
// mismas 6 infografías con la misma numeración.
export const CATEGORY_ORDER: InfographicSetCategory[] = [
  "portada",
  "producto",
  "beneficios",
  "comparacion",
  "en_uso",
  "aclaracion",
];

export const CATEGORY_LABELS: Record<InfographicSetCategory, string> = {
  portada: "1. Portada",
  producto: "2. Producto",
  beneficios: "3. Beneficios",
  comparacion: "4. Comparación",
  en_uso: "5. Producto en uso",
  aclaracion: "6. Aclaración",
};
