import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // Development only: the "N" badge defaults to bottom-left, where it covers
  // the sidebar's Settings row and its collapse/show buttons.
  devIndicators: { position: "bottom-right" },
  // Development only: let a phone on the same Wi-Fi open the dev server by
  // this computer's address (http://192.168.x.x:3000). Without it Next blocks
  // the phone from loading the dev scripts, so the page shows but never reacts.
  // Phone-only behaviour (safe areas, the keyboard, sticky hover) can only be
  // checked on a real phone.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Demo cars' hero photos (scripts/demo-car-photos.mts).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/generated/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /warranties is a landing route only — the module is split into
      // In-House / External / Claims tabs. Redirect at the Next.js routing
      // layer (works regardless of whether middleware runs; Turbopack's dev
      // server sometimes skips middleware/proxy until the .next cache warms).
      {
        source: "/warranties",
        destination: "/warranties/in-house",
        permanent: false,
      },
      // Module E.1 — the legacy Inventory > Listings route was removed
      // (duplicated Worklist). Redirect any stale bookmarks to All
      // Vehicles (the current Inventory equivalent in this codebase).
      {
        source: "/admin/inventory/listings",
        destination: "/vehicles",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
