"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import logoLight from "@/public/assets/logo.png";
import logoWhite from "@/public/assets/logo-white.png";

export function PronuviaLogoDark() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = mounted && theme === "dark" ? logoWhite : logoLight;

  return (
    <Link href="/" className="flex items-center gap-1.5 select-none">
      <Image src={src} alt="Pronuvia Logo" width={1000} height={1000} className="h-auto w-32" />
    </Link>
  );
}
