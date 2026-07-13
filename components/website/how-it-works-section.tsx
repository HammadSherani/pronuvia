export function HowItWorksSection() {
  const STEPS = [
    {
      num: "01",
      title: "Delivers ionic calcium",
      body: "Antiorbital bonding releases calcium in its active Ca²⁺ form the moment it is absorbed. No conversion required, and no dependence on stomach acid.",
    },
    {
      num: "02",
      title: "Sustains elevated levels",
      body: "Rather than a brief spike that fades, AIC is designed to keep serum ionic calcium elevated across many hours — maintaining the signal, not just creating it.",
    },
    {
      num: "03",
      title: "Restores homeostasis",
      body: "Sustained ionic calcium supports the body's own effort to maintain healthy calcium homeostasis — the balance on which so much of cellular life depends.",
    },
    {
      num: "04",
      title: "The cells respond",
      body: "Balanced ionic calcium supports normal cell signaling and mitochondrial function. From there, the body's own natural responses do the work.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#0B1628] py-16">
      <div className="max-w-7xl mx-auto px-8">

        {/* ── Top: label + heading ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 mb-12">

          {/* Label */}
          <div className="pt-2">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/35">
              How AIC Works
            </p>
          </div>

          {/* Heading + body */}
          <div className="max-w-xl">
            <h2
              className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-white mb-2"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              A delivery system.
            </h2>
            <h2
              className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] mb-6"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontStyle: "italic",
                color: "#3DBFA4",
              }}
            >
              Not another calcium.
            </h2>
            <p className="text-[14px] text-white/50 leading-relaxed">
              Our approach rests on a single idea: give the body sustained access to ionic calcium,
              then let the body do what it naturally does with it.
            </p>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="border-t border-white/10">
          {STEPS.map(({ num, title, body }) => (
            <div
              key={num}
              className="grid grid-cols-[48px_1fr_1fr] gap-6 items-start py-7 border-b border-white/10"
            >
              {/* Number */}
              <span
                className="text-[1.3rem] text-white/20 mt-0.5 select-none"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {num}
              </span>

              {/* Title */}
              <h3
                className="text-[1rem] text-white leading-snug"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
              >
                {title}
              </h3>

              {/* Body */}
              <p className="text-[13px] text-[#8BB8D8] leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* ── Quote ── */}
        <div className="mt-12 pl-5 border-l-2 border-[#3DBFA4]/50 max-w-2xl">
          <p
            className="text-[0.95rem] text-white/80 leading-relaxed mb-2"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            "We do not push the body toward an outcome. We restore a signal it already knows how to read."
          </p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">
            The Pronuvia approach
          </p>
        </div>

      </div>
    </section>
  );
}
