import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage build
  output: "standalone",

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
