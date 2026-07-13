export function MarqueeStrip() {
  const PARTNERS = [
    "Calcium & Bone Health Institute",
    "University Research Partners",
    "Presented at AACR 2025",
    "Collaborative Clinical Studies",
  ];

  return (
    <div className="bg-[#EEF2F7] border-t border-b border-[#d5dde9] py-5">
      <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-4">

        {/* Label */}
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45">
          Developed &amp; Studied in Collaboration
        </p>

        {/* Partners row */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {PARTNERS.map((name, i) => (
            <span
              key={i}
              className="text-[14px] text-[#1B2D4F]/55 select-none"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
            >
              {name}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
