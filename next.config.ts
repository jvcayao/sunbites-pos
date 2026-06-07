import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These MSW dependencies are ESM-only; adding them here makes next/jest transform them in tests
  transpilePackages: ["rettime", "until-async", "@open-draft/deferred-promise"],
};

export default nextConfig;
