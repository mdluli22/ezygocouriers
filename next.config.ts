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

  // Keep the admin dashboard at the clean admin-subdomain root while serving
  // the existing /admin route internally.
  async rewrites() {
    return {
      // beforeFiles is required because this project already has a real `/`
      // page; an array-form (afterFiles) rewrite loses to that filesystem route.
      beforeFiles: [
        {
          source: "/",
          has: [
            {
              type: "host",
              value: "admin.ezygocouriers.co.za",
            },
          ],
          destination: "/admin",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
