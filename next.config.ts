import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  // bullmq statically imports its optional @valkey/valkey-glide backend,
  // which isn't installed (we only use the default ioredis backend).
  // Bundling bullmq/ioredis through webpack makes that unresolvable import
  // a hard build failure; treating them as external Node requires instead
  // resolves them at runtime like a normal server dependency.
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default nextConfig;
