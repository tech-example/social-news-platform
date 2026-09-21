/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ]
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"]
  }
};

export default nextConfig;
