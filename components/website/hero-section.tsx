"use client";
import Image from "next/image";
import img4 from "@/public/assets/inside-image.jpg";

export function HeroSection() {
  return (
    <section className="bg-[#EEF2F7] min-h-[calc(100vh-72px)] flex items-center">
      <div className="max-w-7xl mx-auto px-8 py-14 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* ── Left: Content ── */}
        <div>
          {/* Label */}
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/50 mb-5">
           Antiorbital Ionic Calcium · AIC
          </p>

          {/* Heading */}
          <h1
            className="text-[2.9rem] lg:text-[3.4rem] leading-[1.08] text-[#1B2D4F] mb-5"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
          >
            Calcium your cells<br />
            can <em className="italic" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>actually</em> use.
          </h1>

          {/* Italic sub-headline */}
          {/* <p
            className="text-[15px] text-[#1B2D4F]/65 mb-5 leading-relaxed"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            The signal your body has been trying, and failing, to receive.
          </p> */}

          {/* Body */}
          <div className="space-y-3 text-[#1B2D4F]/60 text-[14px] leading-relaxed mb-8">
            <p>
            Most calcium never reaches the form your body can put to work. Pronuvia delivers calcium in its active ionic form — and keeps ionic calcium elevated for hours, giving your cells the signal they were designed to respond to.

            </p>
            {/* <p>
              Sustained ionic calcium supports the body's own calcium homeostasis — and the cell
              signaling and mitochondrial function that depend on it.
            </p> */}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="#how-it-works"
              onClick={e => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}
              className="inline-flex items-center px-6 py-2.5 bg-[#1B2D4F] text-white text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#0f1e36] transition-colors"
            >
              How AIC Works
            </a>
            <a
              href="#for-practitioners"
              onClick={e => { e.preventDefault(); document.getElementById("for-practitioners")?.scrollIntoView({ behavior: "smooth" }); }}
              className="inline-flex items-center px-6 py-2.5 border border-[#1B2D4F] text-[#1B2D4F] text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#1B2D4F]/5 transition-colors"
            >
              Find a Practitioner
            </a>
          </div>

          {/* Supporting line */}
          <p className="text-[12px] text-[#1B2D4F]/40 mb-9">
            A liquid ionic-calcium delivery system · Available through healthcare practitioners
          </p>

          {/* Stats row */}
          <div className="border-t border-[#1B2D4F]/15 pt-5 grid grid-cols-3 gap-6">
            {[
              {
                title: "Ionic",
                sub: "Delivered in the active Ca²⁺ form — the only physiologically active form of calcium.",
              },
              {
                title: "Hours",
                sub: "Sustained elevation of ionic calcium — designed to maintain the signal, not spike and fade.",
              },
              {
                title: "No stomach acid",
                sub: "Absorption that bypasses digestion — no dependence on Vitamin D or peptides.",
              },
            ].map(({ title, sub }) => (
              <div key={title}>
                <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#1B2D4F] mb-1.5">{title}</p>
                <p className="text-[11px] text-[#1B2D4F]/50 leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Image ── */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative">
            <Image
              src={img4}
              alt="Ionic calcium"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

      </div>
    </section>
  );
}
