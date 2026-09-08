const countries = ["🇨🇴", "🇲🇽", "🇦🇷", "🇧🇷", "🇨🇱", "🇵🇪", "🇪🇨", "🇺🇾", "🇻🇪"];

export function SocialProof() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-10">
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Vendedores MercadoLíder en toda Latinoamérica ya optimizan su rentabilidad
          con MeliBoost
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-2xl">
          {countries.map((flag) => (
            <span key={flag} aria-hidden>
              {flag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
