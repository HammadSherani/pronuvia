export function BodyResponseSection() {
  const CARDS = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="3" fill="#1B2D4F" opacity="0.4"/>
          <circle cx="14" cy="6"  r="1.5" fill="#1B2D4F" opacity="0.25"/>
          <circle cx="14" cy="22" r="1.5" fill="#1B2D4F" opacity="0.25"/>
          <circle cx="6"  cy="14" r="1.5" fill="#1B2D4F" opacity="0.25"/>
          <circle cx="22" cy="14" r="1.5" fill="#1B2D4F" opacity="0.25"/>
        </svg>
      ),
      title: "Cell signaling",
      body: "Ionic calcium is a primary messenger inside cells. Sustained, balanced levels help support normal calcium-driven cell signaling.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <path d="M16 4L10 15h6l-4 9 10-13h-6L16 4z" stroke="#1B2D4F" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.5"/>
        </svg>
      ),
      title: "Mitochondrial function",
      body: "Healthy calcium balance supports normal mitochondrial function — part of how cells maintain their everyday energy and resilience.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <path d="M3 14 Q7 7 11 14 Q15 21 19 14 Q23 7 25 14" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        </svg>
      ),
      title: "Calcium homeostasis",
      body: "By supplying calcium in its active form, AIC supports the body’s effort to maintain healthy calcium homeostasis.",
    },
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-8">

        {/* ── Top: label + heading ── */}
        <div className="mb-10 max-w-xl">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45 mb-5">
            The Body Does the Work
          </p>
          <h2
            className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-[#1B2D4F] mb-1"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
          >
            We deliver the signal.
          </h2>
          <h2
            className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] mb-5"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 400,
              fontStyle: "italic",
              color: "#1B2D4F",
            }}
          >
            Your body responds.
          </h2>
          <p className="text-[14px] text-[#1B2D4F]/60 leading-relaxed">
           Pronuvia doesn’t force an outcome. By restoring sustained ionic calcium, AIC supports the conditions your body needs — and the body’s own natural responses follow.
          </p>
        </div>

        {/* ── Three cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-[#c8d4e3]">
          {CARDS.map(({ icon, title, body }, i) => (
            <div
              key={i}
              className={`p-8 ${i < 2 ? "border-b md:border-b-0 md:border-r border-[#c8d4e3]" : ""} bg-white`}
            >
              {/* Icon */}
              <div className="mb-5">{icon}</div>

              {/* Title */}
              <h3
                className="text-[1rem] text-[#1B2D4F] mb-3"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
              >
                {title}
              </h3>

              {/* Body */}
              <p className="text-[13px] text-[#1B2D4F]/55 leading-relaxed">
                {body}
                <span className="text-[#1B2D4F]/30">*</span>
              </p>
            </div>
          ))}
        </div>

        {/* ── FDA disclaimer ── */}
        <p className="mt-6 text-[11px] text-[#1B2D4F]/35 leading-relaxed">
          * These statements have not been evaluated by the Food and Drug Administration.
          This product is not intended to diagnose, treat, cure, or prevent any disease.
        </p>

      </div>
    </section>
  );
}
