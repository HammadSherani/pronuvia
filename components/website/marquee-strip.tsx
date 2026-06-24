"use client";

const BRANDS = [
  "SOLO",
  "nuova",
  "Kvants",
  "NARADA",
  "Ridgerunner",
  "GoNation",
];

export function MarqueeStrip() {
  const items = [...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <div className="bg-white  py-8 overflow-hidden">
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 20s linear infinite;
        }
      `}</style>

      <div className="marquee-track">
        {items.map((brand, i) => (
          <span
            key={i}
            className="px-16 text-[#3DBFA4] font-bold text-2xl tracking-widest shrink-0 select-none"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}
