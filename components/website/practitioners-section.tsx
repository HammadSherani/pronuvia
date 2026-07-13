export function PractitionersSection() {
  return (
    <section id="for-practitioners" className="bg-[#0B1628] py-16">
      <div className="max-w-7xl mx-auto px-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: Content ── */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/35 mb-6">
              For Practitioners
            </p>

            <h2
              className="text-[2.4rem] lg:text-[2.8rem] leading-[1.1] text-white mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
            >
              Offer ionic calcium<br />
              in{" "}
              <em
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  color: "#3DBFA4",
                }}
              >
                your practice.
              </em>
            </h2>

            <p className="text-[14px] text-white/55 leading-relaxed mb-8">
              Pronuvia AIC reaches patients through partnering physicians and health practitioners.
              Join the partner network to order for your practice, manage patients, and access
              clinical materials.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="/partnering-physician"
                className="inline-flex items-center px-6 py-2.5 border border-white/40 text-white text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-white/10 transition-colors"
              >
                Become a Partner
              </a>
              <a
                href="/login"
                className="inline-flex items-center px-6 py-2.5 border border-white/40 text-white text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-white/10 transition-colors"
              >
                Partner Login
              </a>
            </div>
          </div>

          {/* ── Right: Pathway card ── */}
          <div className="border border-white/15 p-7 rounded-sm">

            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/35 mb-6">
              The Pathway
            </p>

            {/* Flow diagram */}
            <div className="flex items-center gap-0 mb-8 flex-wrap">

              {/* Step 1 */}
              <div className="border border-white/30 px-4 py-3 text-center min-w-[100px]">
                <p className="text-[13px] font-bold text-white">Pronuvia</p>
                <p className="text-[10px] text-white/40 mt-0.5">AIC formulation</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center px-2">
                <div className="w-5 h-px bg-white/25" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
              </div>

              {/* Step 2 — highlighted */}
              <div className="border-2 border-white/50 px-4 py-3 text-center min-w-[100px]">
                <p className="text-[13px] font-bold text-white">Practitioner</p>
                <p className="text-[10px] text-white/40 mt-0.5">guides therapy</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center px-2">
                <div className="w-5 h-px bg-white/25" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
              </div>

              {/* Step 3 */}
              <div className="border border-white/30 px-4 py-3 text-center min-w-[90px]">
                <p className="text-[13px] font-bold text-white">Patient</p>
                <p className="text-[10px] text-white/40 mt-0.5">daily routine</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-5">
              <p
                className="text-[0.95rem] text-[#3DBFA4] mb-2"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                }}
              >
                Mixed into water. Taken daily.
              </p>
              <p className="text-[13px] text-white/45 leading-relaxed">
                A non-invasive liquid, used under the guidance of a qualified healthcare
                practitioner.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
