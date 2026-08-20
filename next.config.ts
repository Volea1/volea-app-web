import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  outputFileTracingRoot: import.meta.dirname,
};

if (process.env.NODE_ENV !== "production") {
  const api = process.env.VOLEA_DEV_API_URL?.replace(/\/$/, "");
  if (api) {
    nextConfig.rewrites = async () => [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
    ];
  }
}

export default nextConfig;
