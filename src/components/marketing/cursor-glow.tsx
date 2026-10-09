"use client";

// Brillo que sigue al cursor — fija --mx/--my en onMouseMove y los usa en un
// radial-gradient de fondo. Puramente decorativo, sin estado ni datos.
export function CursorGlow({ children, className }: { children: React.ReactNode; className?: string }) {
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative rounded-[28px] before:pointer-events-none before:absolute before:inset-0 before:rounded-[28px] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:[background:radial-gradient(300px_circle_at_var(--mx,50%)_var(--my,50%),color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
