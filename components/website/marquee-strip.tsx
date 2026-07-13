export function MarqueeStrip() {
  const PARTNERS = [
    "Calcium & Bone Health Institute",
    "University Research Partners",
    "Presented at AACR 2025",
    "Collaborative Clinical Studies",
  ];

  return (
    <div className="bg-[#EEF2F7] border-t border-b border-[#d5dde9] py-10">
      <div className="max-w-7xl mx-auto px-8">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-start">

          {/* Left: Headline + body */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45 mb-3">
              Developed &amp; Studied in Collaboration
            </p>
            <p className="text-[14px] text-[#1B2D4F]/60 leading-relaxed">
              Antiorbital Ionic Calcium was developed through collaborative research and continues
              to be studied with universities, research institutes, and clinicians. Our marketing
              is grounded in that science — not in promises.
            </p>
          </div>

          {/* Right: Partner chips */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end lg:pt-7">
            {PARTNERS.map((name, i) => (
              <span
                key={i}
                className="text-[13px] text-[#1B2D4F]/50 select-none"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
              >
                {name}
                {i < PARTNERS.length - 1 && (
                  <span className="ml-6 text-[#1B2D4F]/25 not-italic">·</span>
                )}
              </span>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
