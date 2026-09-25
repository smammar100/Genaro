"use client";

import dynamic from "next/dynamic";

// Loaded after hydration, and only where the root layout renders this (on a
// Vercel deployment): off Vercel both scripts have nowhere to report to, and
// a static import would put them in every page's first-load JS regardless.
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

export function VercelInsights() {
  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
