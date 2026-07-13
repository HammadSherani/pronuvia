export function ResearchSection() {
  return (
    <section id="research" className="bg-[#EEF2F7] py-16">
      <div className="max-w-7xl mx-auto px-8">

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 items-start">

          {/* Label */}
          <div className="pt-2">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45">
              Rooted in Research
            </p>
          </div>

          {/* Content */}
          <div className="max-w-xl">
            <h2
              className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-[#1B2D4F] mb-1"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              Science first.
            </h2>
            <h2
              className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-[#1B2D4F] mb-5"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              Promises never.
            </h2>

            <p className="text-[14px] text-[#1B2D4F]/60 leading-relaxed mb-8">
              Antiorbital Ionic Calcium was developed through collaborative research and continues
              to be studied alongside universities, research institutes and practising clinicians.
              What we say publicly is grounded in that work — and stops where the evidence does.
            </p>

            <a
              href="#"
              className="inline-flex items-center px-6 py-2.5 border border-[#1B2D4F] text-[#1B2D4F] text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#1B2D4F]/5 transition-colors"
            >
              Read the Research
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
