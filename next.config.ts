import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./app/generated/prisma/**"],
  },
  images: {
    // Allow images served from the same origin (public folder uploads)
    remotePatterns: [],
    // Fallback: don't break on missing images in dev
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  experimental: {
    serverActions: {
      // Allow server actions from your Vercel domain + localhost
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "pronuvia.vercel.app",
      ],
    },
  },
};

export default nextConfig;
