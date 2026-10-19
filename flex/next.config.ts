import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photo posts and avatars are resized in the browser, but still need more than the 1 MB default.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
