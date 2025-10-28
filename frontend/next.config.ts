import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    generateBuildId: async () => {
        return Date.now().toString(); // force unique build ID each time
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;