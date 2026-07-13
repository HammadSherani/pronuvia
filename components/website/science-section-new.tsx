export function TheScienceSection() {
  const CONS = [
    "Arrive protein-bound, in a slow-release standby form",
    "Only a fraction is absorbed and converted",
    "Depend on stomach acid, Vitamin D and peptides",
    "Levels rise and fall quickly",
    "Excess may contribute to unwanted build-up",
  ];

  const PROS = [
    <>Delivered already in the active ionic Ca²⁺ form</>,
    <>Absorbs directly, bypassing the need for digestion</>,
    <>No reliance on stomach acid or Vitamin D</>,
    <>Ionic calcium stays elevated for hours</>,
    <>Supports the body's natural calcium balance</>,
  ];

  return (
    <section id="the-science" className="bg-[#EEF2F7] py-16">
      <div className="max-w-7xl mx-auto px-8">

        {/* ── Top: label + heading ── */}
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45 mb-5">
            Why Ionic Matters
          </p>
          <h2
            className="text-[2.2rem] lg:text-[2.7rem] leading-[1.1] text-[#1B2D4F] mb-1"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
          >
            Absorption isn&apos;t the whole story.
          </h2>
          <h2
            className="text-[2.2rem] lg:text-[2.7rem] leading-[1.1] mb-5"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 400,
              fontStyle: "italic",
              color: "#1B2D4F",
            }}
          >
            Form is.
          </h2>
          <p className="text-[14px] text-[#1B2D4F]/60 leading-relaxed">
            What distinguishes AIC is not simply how much calcium is absorbed, but that it arrives
            active — and stays active long enough to matter.
          </p>
        </div>

        {/* ── Comparison columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* Left — Other calcium sources */}
          <div className="md:pr-10">
            <div className="border-b border-[#1B2D4F]/15 pb-3 mb-5">
              <p
                className="text-[14px] text-[#1B2D4F]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Other calcium sources
              </p>
            </div>
            <ul className="space-y-0">
              {CONS.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 py-3 border-b border-[#1B2D4F]/8 last:border-0"
                >
                  <span className="text-[#1B2D4F]/30 text-sm mt-0.5 shrink-0 select-none">—</span>
                  <span className="text-[13px] text-[#1B2D4F]/65 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Pronuvia AIC */}
          <div className="md:pl-10 md:border-l border-[#1B2D4F]/10 mt-8 md:mt-0">
            <div className="border-b border-[#1B2D4F]/15 pb-3 mb-5">
              <p
                className="text-[14px] text-[#1B2D4F]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Pronuvia Antiorbital Ionic Calcium
              </p>
            </div>
            <ul className="space-y-0">
              {PROS.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 py-3 border-b border-[#1B2D4F]/8 last:border-0"
                >
                  <span className="text-[#1B2D4F] text-sm mt-0.5 shrink-0 select-none">✓</span>
                  <span className="text-[13px] text-[#1B2D4F]/65 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
