import Image from "next/image";
import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Login – Pronuvia",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-[900px] rounded-xl overflow-hidden border-2 border-[#5BB8D4] shadow-2xl flex min-h-[560px]">
      {/* ── Left panel ── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col bg-gradient-to-br from-[#d4f0eb] to-[#a8ddd5]">
        {/* Page label */}
        <span className="absolute top-5 left-6 text-xs font-bold tracking-[0.18em] text-[#5BB8D4] uppercase">
          Login
        </span>

        {/* Product image */}
        <div className="flex flex-1 items-center justify-center p-8">
          <Image
            src="/product-bottle.png"
            alt="Pronuvia Maragen Dietary Supplement"
            width={280}
            height={380}
            className="object-contain drop-shadow-xl"
            priority
          />
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
