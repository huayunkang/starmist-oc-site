import type { NextConfig } from "next";

const buildForCloudflare = process.env.STARMIST_CLOUDFLARE_STATIC === "1";

const nextConfig: NextConfig = {
  // The local-only admin page uses the .local.tsx extension.
  pageExtensions: buildForCloudflare
    ? ["tsx", "ts", "jsx", "js"]
    : ["local.tsx", "tsx", "ts", "jsx", "js"],
  ...(buildForCloudflare ? { output: "export" } : {}),
};

export default nextConfig;
