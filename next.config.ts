import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // three.js must be transpiled for the standalone build
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;
