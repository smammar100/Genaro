import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { PolarisLinkProvider } from "@/components/polaris-link-provider";
import { Toaster } from "@/components/ui/toaster";
import { VercelInsights } from "@/components/vercel-insights";
import { getInitialAuth } from "@/lib/auth-initial";
import { AuthBoundary } from "@/components/layout/auth-boundary";
import { SidebarPreference } from "@/components/layout/sidebar-preference";
import { TitleTooltips } from "@/components/layout/title-tooltips";
import { cookies } from "next/headers";

// Type is Geist, and Geist Mono wherever a mono face is used (call
// 2026-10-25). Both are self-hosted by next/font as --font-geist-sans and
// --font-geist-mono; the Polaris tokens make them --font-sans / --font-mono.
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// Latin only, and not preloaded: reg plates are never what a page paints
// first, and the sign-in pages show none, so it shouldn't compete with Geist
// and the CSS for the first paint. It swaps in when a page first shows one.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Car Capital UK",
  description: "Used-car dealership management platform",
};

// Root layout reads cookies via getInitialAuth() — every route is dynamic.
// Force this explicitly so Next.js doesn't try to prerender child routes
// (which would trip the CSR-bailout error on pages using useSearchParams).
export const dynamic = "force-dynamic";

// Deploy to London first (UK = primary production market), Mumbai as fallback
// for South Asian traffic. Both are dramatically closer than the iad1 default.
export const preferredRegion = ["lhr1", "bom1"];

const SUPABASE_HOSTNAME = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return u ? new URL(u).hostname : null;
  } catch {
    return null;
  }
})();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Start the auth fetch without blocking — the HTML shell streams immediately
  // while Supabase resolves in the background. AuthBoundary awaits the promise
  // inside a Suspense boundary so fonts/CSS reach the browser ~400 ms sooner.
  const authPromise = getInitialAuth();
  // The sidebar writes `sidebar_state` whenever it is collapsed or shown
  // (SIDEBAR_COOKIE_NAME in fluid/sidebar-core, a client module, so the
  // literal is repeated here rather than imported into a server file).
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <html
      lang="en"
      // Browser extensions (e.g. Demoway, focus-visible polyfills) mutate the
      // <html>/<body> attributes before React hydrates. next-themes also writes
      // the theme class here pre-hydration. Suppress silences attribute
      // mismatches on this element itself — children still warn.
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <head>
        {SUPABASE_HOSTNAME && (
          <>
            <link
              rel="preconnect"
              href={`https://${SUPABASE_HOSTNAME}`}
              crossOrigin=""
            />
            <link rel="dns-prefetch" href={`https://${SUPABASE_HOSTNAME}`} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Light or dark, both Polaris's own token sets (tokens.css declares
            dark under `.dark`); the top bar's switch sets it and next-themes
            remembers it. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {/* Notifications, tooltips and the motion settings live in the
              dashboard layout: the sign-in pages use none of them, and
              loading them here put the notification services, realtime,
              Base UI's tooltip and framer-motion on every auth page's
              critical path. */}
          <SidebarPreference defaultOpen={sidebarOpen}>
          <PolarisLinkProvider>
          <Suspense
            fallback={
              <AuthProvider initialUser={null} initialCompany={null}>
                {children}
              </AuthProvider>
            }
          >
            <AuthBoundary authPromise={authPromise}>{children}</AuthBoundary>
          </Suspense>
          </PolarisLinkProvider>
          </SidebarPreference>
          <Toaster />
          <TitleTooltips />
        </ThemeProvider>
        {/* Vercel sets VERCEL=1 on its builds and runtime; elsewhere (local,
            self-hosted `next start`) analytics has no endpoint to report to. */}
        {process.env.VERCEL ? <VercelInsights /> : null}
      </body>
    </html>
  );
}
