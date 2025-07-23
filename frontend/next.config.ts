import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    generateBuildId: async () => {
    return Date.now().toString(); // force unique build ID each time
  },
};

export default nextConfig;
