import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the local network load the dev server (npm run dev:https, then https://<laptop IP>:3000).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
  partialPrefetching: true,
};

export default nextConfig;
