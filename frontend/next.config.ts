import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ['@mediapipe/face_detection', '@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
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