// Formato de cifras del diseño: "$96.796.400" y "−$14.423.767" (signo menos
// real U+2212, no guion). Usa narrowSymbol para que COP salga como "$" igual
// que en los prototipos, sin perder el símbolo correcto en otros países
// (R$ en Brasil, S/ en Perú).
export function formatMoney(value: number, currencyId: string) {
  const rounded = Math.round(Math.abs(value));
  let body: string;
  try {
    body = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyId,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    body = `$${rounded.toLocaleString("es-CO")}`;
  }
  // Intl mete un espacio duro entre el símbolo y la cifra en es-CO; el diseño
  // los pega ("$96.796.400").
  body = body.replace(/ /g, "");
  return value < 0 ? `−${body}` : body;
}

// Porcentajes con coma decimal, como el resto de las cifras en es-CO.
export function formatPercent(value: number, decimals = 1) {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

// Para montos que ya se muestran como descuento (la UI antepone el signo).
export function formatMoneyAbs(value: number, currencyId: string) {
  return formatMoney(Math.abs(value), currencyId);
}

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString("es-CO");
}
