import type { NextConfig } from "next";
import { PERMANENT_REDIRECTS } from "./lib/seo/permanent-redirects";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return PERMANENT_REDIRECTS.map((redirect) => ({
      ...redirect,
      permanent: true as const,
    }));
  },
};

export default nextConfig;
