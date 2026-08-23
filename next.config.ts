import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/**/*": ["node_modules/pdfjs-dist/**/*.mjs"]
  }
};

export default nextConfig;
