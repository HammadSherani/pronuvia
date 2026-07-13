"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: "#0B1220" }} className="text-white w-full">

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-10 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-12 lg:gap-20">

          {/* Col 1 — Brand */}
          <div className="max-w-md">
            <div className="flex items-baseline gap-3 mb-6">
              <span
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontWeight: 700,
                  fontSize: "1.6rem",
                  color: "#ffffff",
                }}
              >
                Pronuvia
              </span>
              <span
                style={{
                  fontFamily: "inherit",
                  fontSize: "0.85rem",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.15em",
                }}
              >
                AIC
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(148,163,184,0.75)", lineHeight: "1.75" }}>
              A liquid ionic-calcium delivery system — Antiorbital Ionic Calcium (AIC) — provided
              to patients through partnering healthcare practitioners.
            </p>
          </div>

          {/* Col 2 — Explore */}
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: "28px",
              }}
            >
              Explore
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "18px" }}>
              {[
                { label: "The Problem",  href: "#the-problem" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "The Science",  href: "#the-science" },
                { label: "Research",     href: "#research" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    style={{
                      fontSize: "15px",
                      color: "rgba(148,163,184,0.7)",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.7)")}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Partners */}
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: "28px",
              }}
            >
              Partners
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "18px" }}>
              {[
                { label: "Become a Partner", href: "/partnering-physician" },
                { label: "Partner Login",    href: "/login" },
                { label: "Contact Us",       href: "/contact" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    style={{
                      fontSize: "15px",
                      color: "rgba(148,163,184,0.7)",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.7)")}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── FDA disclaimer ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-10 py-8">
          <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.55)", lineHeight: "1.8" }}>
            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>Important.</span>{" "}
            These statements have not been evaluated by the Food and Drug Administration.
            This product is not intended to diagnose, treat, cure, or prevent any disease.
            Pronuvia products are dietary supplements and are not a substitute for professional
            medical advice, diagnosis, or treatment. Always consult a qualified healthcare
            practitioner before beginning any supplement. Individual experiences vary.
          </p>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="max-w-7xl mx-auto px-10 py-6"
          style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
        >
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
            © 2026 Pronuvia. All rights reserved.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
            Antiorbital Ionic Calcium (AIC) describes the product&apos;s ionic-calcium delivery technology.
          </p>
        </div>
      </div>

    </footer>
  );
}
