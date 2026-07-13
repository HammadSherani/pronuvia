export function ProblemSection() {
  return (
    <section id="the-problem" className="bg-[#EEF2F7] py-16">
      <div className="max-w-7xl mx-auto px-8">

        {/* ── Top: label + heading ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 mb-12">

          {/* Label */}
          <div className="pt-2">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45">
              The Calcium Problem
            </p>
          </div>

          {/* Heading + body */}
          <div className="max-w-2xl">
            <h2
              className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-[#1B2D4F] mb-5"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              Not all calcium<br />
              works the <em style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>same way.</em>
            </h2>
            <p className="text-[14px] text-[#1B2D4F]/60 leading-relaxed">
             Calcium is only active in its free ionic state (Ca²⁺). Yet nearly all dietary and supplemental calcium ends up protein-bound — a slow-release “standby” form the body converts only gradually.

            </p>
          </div>
        </div>

        {/* ── Bottom: comparison cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-[#c8d4e3]">

          {/* Card 1 — Conventional Calcium */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-[#c8d4e3] bg-white">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/40 mb-4">
              Conventional Calcium
            </p>
            <h3
              className="text-[1.4rem] text-[#1B2D4F] mb-4"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              Locked in standby.
            </h3>
            <p className="text-[13px] text-[#1B2D4F]/55 leading-relaxed">
             Tablets and food-based calcium arrive protein-bound. Only a small fraction is absorbed, and the body must slowly convert it — a process that depends on stomach acid, Vitamin D, and healthy digestion that many people lack.

            </p>
          </div>

          {/* Card 2 — Pronuvia AIC */}
          <div className="p-8 bg-white">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/40 mb-4">
              Pronuvia AIC
            </p>
            <h3
              className="text-[1.4rem] text-[#1B2D4F] mb-4"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              Ready to act.
            </h3>
            <p className="text-[13px] text-[#1B2D4F]/55 leading-relaxed">
             Antiorbital Ionic Calcium is delivered already in the ionic Ca²⁺ form and stays elevated for hours — so the calcium signal your cells rely on is present and sustained, not fleeting.

            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
