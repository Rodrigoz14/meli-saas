// Margen proyectado con el precio/comisión actuales de la publicación (para
// productos sin ventas en el periodo, o como referencia "si vendo uno hoy").
// El envío no entra aquí porque solo se conoce por orden real, no por
// publicación — para eso está computePeriodProfit.
export function computeNetProfit(row: { price: number; saleFee: number; cogs: number }) {
  const netProfit = row.price - row.saleFee - row.cogs;
  const margin = row.price > 0 ? (netProfit / row.price) * 100 : 0;
  return { netProfit, margin };
}

// Rentabilidad real del periodo: ingreso, comisión y envío son datos reales
// de las órdenes (no estimaciones ni valores que el usuario deba adivinar).
// Lo único que introduce el usuario es el costo de su producto (COGS). Si
// no hubo ventas en el periodo, no hay ganancia realizada, pero se muestra
// el margen proyectado (precio/comisión actuales) para saber si vale la
// pena seguir vendiendo ese producto.
export function computePeriodProfit(row: {
  price: number;
  saleFee: number;
  cogs: number;
  unitsSold: number;
  revenue: number;
  commission: number;
  shipping: number;
  taxWithholdingPercent: number;
}) {
  if (row.unitsSold > 0 && row.revenue > 0) {
    // Si la orden no trajo comisión real (campo ausente), se estima
    // prorrateando la tasa de comisión actual sobre el ingreso real.
    const commission =
      row.commission > 0
        ? row.commission
        : row.revenue * (row.price > 0 ? row.saleFee / row.price : 0);
    const retention = row.revenue * (row.taxWithholdingPercent / 100);
    const netProfit =
      row.revenue - commission - row.shipping - retention - row.cogs * row.unitsSold;
    const margin = (netProfit / row.revenue) * 100;
    return { netProfit, margin, retention };
  }

  const { margin } = computeNetProfit(row);
  return { netProfit: 0, margin, retention: 0 };
}

export function diagnose(margin: number, hasCost: boolean) {
  if (!hasCost) return "Asigna el costo del producto";
  if (margin < 15) return "Sube el precio o renegocia costos";
  if (margin < 30) return "Margen aceptable, hay espacio de mejora";
  return "Rentabilidad saludable";
}
