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
  // jsdom is a transitive devDependency of vitest (test env only — no
  // runtime code imports it since extract-article.ts moved to linkedom),
  // but Vercel's serverless output tracing was still pulling it (and its
  // ESM-only sub-dependency chain, which crashes on require()) into every
  // route's function bundle. Exclude it explicitly rather than rely on
  // tracing to infer it's unreachable.
  outputFileTracingExcludes: {
    "*": ["**/node_modules/jsdom/**", "**/node_modules/html-encoding-sniffer/**"],
  },
};

export default nextConfig;
