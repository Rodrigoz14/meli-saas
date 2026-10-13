"use client";

import { useEffect, useRef, useState } from "react";

// Anima el número de un valor al siguiente en 900ms (ease-out cúbico), sin
// tocar de dónde viene el valor — solo una transición visual sobre un número
// ya calculado. El formato de moneda se hace adentro (no se puede recibir
// una función como prop desde un Server Component).
export function AnimatedNumber({ value, currencyId }: { value: number; currencyId: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const duration = 900;
    const start = performance.now();
    let raf = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyId,
      maximumFractionDigits: 0,
    }).format(display);
  } catch {
    formatted = `$${Math.round(display).toLocaleString()}`;
  }

  return <>{formatted}</>;
}
