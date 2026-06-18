import Link from "next/link";

export function PronuviaLogoDark() {
  return (
    <Link href="/" className="flex items-center gap-1.5 select-none">
      <svg
        width="38"
        height="38"
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circular top of the pin / lock shape */}
        <circle cx="21" cy="14" r="10" stroke="#5a6a7a" strokeWidth="3.5" fill="none" />
        {/* Inner circle */}
        <circle cx="21" cy="14" r="4.5" fill="#5a6a7a" />
        {/* Descender line (the tail of the pin) */}
        <line
          x1="21"
          y1="24"
          x2="21"
          y2="38"
          stroke="#5a6a7a"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="text-[#5a6a7a] font-semibold text-[1.35rem] tracking-wide"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Pronuvia
      </span>
    </Link>
  );
}
