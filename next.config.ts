import type { NextConfig } from "next";
const productionBuild = process.env.TEAMPLUS_BUILD_TARGET === "production";
const nextConfig: NextConfig = {
  ...(productionBuild
    ? {
        output: "standalone" as const,
        distDir: ".next-production",
        typescript: { tsconfigPath: "tsconfig.production.json" },
      }
    : {}),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          ...(productionBuild
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
};
export default nextConfig;
