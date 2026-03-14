import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Next 16.1.6: Server Actions config is under experimental
  serverExternalPackages: ["@react-pdf/renderer", "qrcode"],

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Turbopack root: point to the parent repo so Turbopack finds node_modules/next.
  // The worktree lives inside this directory so source files remain compilable.
  turbopack: {
    root: path.resolve(__dirname, "../../../.."),
  },

  async headers() {
    return [
      {
        source: "/(logos|images|icons)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
