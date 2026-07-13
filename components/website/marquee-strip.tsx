export function MarqueeStrip() {
  const items = [
    { k: "01", h: "Ionic",           p: "Delivered in the active Ca²⁺ form — the only physiologically active form of calcium." },
    { k: "02", h: "Hours",           p: "Sustained elevation of ionic calcium — designed to maintain the signal, not spike and fade." },
    { k: "03", h: "No stomach acid", p: "Absorption that bypasses digestion — no dependence on Vitamin D or peptides." },
  ];

  return (
    <section className="relative bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-ion/20 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-white/10 md:grid-cols-3">
        {items.map(it => (
          <div key={it.k} className="bg-ink px-8 py-14 lg:px-12 lg:py-16">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-ion">{it.k}</span>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <h3
              className="mt-6 text-4xl lg:text-5xl text-white tracking-tight"
              style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400 }}
            >
              {it.h}
            </h3>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">{it.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
