"use client";

import { useState } from "react";

const FAQS = [
  {
    q: `What is "ionic" calcium, and why does it matter?`,
    a: `Calcium is only physiologically active in its free ionic state (Ca²⁺). Most dietary and supplemental calcium arrives protein-bound and must be slowly converted. AIC delivers calcium already in the ionic form, so it is ready for the body to use.`,
  },
  {
    q: "Does more calcium mean more benefit?",
    a: "Not necessarily. What matters is the form, and how long ionic calcium stays available. AIC is designed for sustained ionic calcium rather than a large dose delivered in a slow-release form.",
  },
  {
    q: "How is AIC taken?",
    a: "AIC is a liquid, simply mixed into water and consumed. It is designed to be a convenient, non-invasive part of a daily routine, used under the guidance of your practitioner.",
  },
  {
    q: "Where does the benefit come from?",
    a: "Pronuvia's role is to deliver and sustain ionic calcium. The responses that follow come from your body's own natural processes, as it works to maintain healthy calcium homeostasis.",
  },
  {
    q: "How do I get AIC?",
    a: `AIC is offered through partnering physicians and health practitioners. Ask your practitioner, or use "Find a practitioner" to connect with a provider in our network.`,
  },
];

export function FaqSectionNew() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#EEF2F7] py-16">
      <div className="max-w-7xl mx-auto px-8">

        {/* ── Header ── */}
        <div className="mb-10">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1B2D4F]/45 mb-4">
            Common Questions
          </p>
          <h2
            className="text-[2.2rem] lg:text-[2.6rem] leading-[1.1] text-[#1B2D4F]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
          >
            Understanding{" "}
            <em style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>ionic calcium.</em>
          </h2>
        </div>

        {/* ── FAQ items ── */}
        <div className="border-t border-[#1B2D4F]/10">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="border-b border-[#1B2D4F]/10">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-8 py-5 text-left group"
              >
                <span
                  className="text-[0.95rem] text-[#1B2D4F] group-hover:text-[#1B2D4F]/70 transition-colors"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {q}
                </span>
                <span className="shrink-0 text-[#1B2D4F]/40 text-lg leading-none select-none w-5 text-center">
                  {open === i ? "−" : "+"}
                </span>
              </button>

              {open === i && (
                <p className="text-[13px] text-[#1B2D4F]/60 leading-relaxed pb-5 max-w-2xl">
                  {a}
                </p>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
