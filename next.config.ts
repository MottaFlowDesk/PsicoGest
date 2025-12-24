import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable static optimization for certain routes that require runtime data
  experimental: {
    // This ensures dynamic rendering for routes that need it
  },
};

export default nextConfig;
