import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Login – Pronuvia",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-[900px] rounded-xl overflow-hidden border-2 border-[#5BB8D4] shadow-2xl flex min-h-[560px]">
      {/* ── Left panel — branded (no external image needed) ── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#3DBFA4] to-[#2a8f7a] p-10 text-white">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h2 className="text-3xl font-black tracking-tight mb-2">PRONUVIA</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Health &amp; Wellness Products
          </p>

          <div className="mt-8 space-y-3 text-left">
            {["Manage Orders & Commissions", "Track Physician Partnerships", "Real-time Wallet & Payouts"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-[#f7f8f9] flex items-center justify-center px-10 py-12">
        <div className="w-full max-w-[340px]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
