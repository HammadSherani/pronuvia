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
          <p
            className="text-[15px] text-[#1B2D4F]/65 mb-5 leading-relaxed"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            The signal your body has been trying, and failing, to receive.
          </p>

          {/* Body */}
          <div className="space-y-3 text-[#1B2D4F]/60 text-[14px] leading-relaxed mb-8">
            <p>
              Nearly all calcium arrives protein-bound — a slow, standby form. Pronuvia delivers
              calcium already in its active ionic state, and keeps ionic calcium elevated for hours.
            </p>
            <p>
              Sustained ionic calcium supports the body's own calcium homeostasis — and the cell
              signaling and mitochondrial function that depend on it.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mb-9">
            <a
              href="#how-it-works"
              className="inline-flex items-center px-6 py-2.5 bg-[#1B2D4F] text-white text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#0f1e36] transition-colors"
            >
              How AIC Works
            </a>
            <a
              href="#for-practitioners"
              className="inline-flex items-center px-6 py-2.5 border border-[#1B2D4F] text-[#1B2D4F] text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#1B2D4F]/5 transition-colors"
            >
              Find a Practitioner
            </a>
          </div>

          {/* Stats row */}
          <div className="border-t border-[#1B2D4F]/15 pt-5 grid grid-cols-3 gap-4">
            {[
              { title: "Ionic delivery",     sub: "Active Ca²⁺ form" },
              { title: "Sustained hours",    sub: "Not a spike" },
              { title: "Practitioner-led",   sub: "Through your provider" },
            ].map(({ title, sub }) => (
              <div key={title}>
                <p className="text-[13px] font-semibold text-[#1B2D4F] mb-0.5">{title}</p>
                <p className="text-[11px] text-[#1B2D4F]/50">{sub}</p>
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
