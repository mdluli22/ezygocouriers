import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage build
  output: "standalone",

  // Explicitly expose NEXT_PUBLIC_ vars (belt-and-suspenders for Docker builds)
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  },

  // Allow Google profile images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // Strict mode for better development warnings
  reactStrictMode: true,
};

export default nextConfig;
