import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { GenaroLinkProvider } from "@/components/genaro-link-provider";
import { Toaster } from "@/components/ui/toaster";
import { VercelInsights } from "@/components/vercel-insights";
import { getInitialAuth } from "@/lib/auth-initial";
import { AuthBoundary } from "@/components/layout/auth-boundary";
import { SidebarPreference } from "@/components/layout/sidebar-preference";
import { TitleTooltips } from "@/components/layout/title-tooltips";
import { ThemeColor } from "@/components/layout/theme-color";
import { tokenColor } from "@/lib/theme-colors";
import { cookies } from "next/headers";

// Type is Geist Sans, everywhere: one family, mono and plates included (call
// 2026-11-01). next/font self-hosts it as --font-geist-sans; the Genaro tokens
// make it --font-sans, and --font-mono points at the same face.
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Car Capital UK",
  description: "Used-car dealership management platform",
};

// Phones (emil-mobile-native): paint under the notch and home indicator (the top
// bar, sheets and toasts pad themselves back out with env(safe-area-inset-*)),
// let the Android keyboard shrink the layout like iOS does so composers and
// bottom buttons stay above it, and tint the status bar the top bar's colour.
// Zoom stays on: inputs are 16px on touch, which is what stopped iOS zooming.
// ThemeColor follows the theme and the page from here on.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: tokenColor("bg-inverse", "light"),
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
        {/* Light or dark, both Genaro's own token sets (tokens.css declares
            dark under `.dark`); the top bar's switch sets it and next-themes
            remembers it. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {/* Notifications, tooltips and the motion settings live in the
              dashboard layout: the sign-in pages use none of them, and
              loading them here put the notification services, realtime,
              Base UI's tooltip and framer-motion on every auth page's
              critical path. */}
          <SidebarPreference defaultOpen={sidebarOpen}>
          <GenaroLinkProvider>
          <Suspense
            fallback={
              <AuthProvider initialUser={null} initialCompany={null}>
                {children}
              </AuthProvider>
            }
          >
            <AuthBoundary authPromise={authPromise}>{children}</AuthBoundary>
          </Suspense>
          </GenaroLinkProvider>
          </SidebarPreference>
          <Toaster />
          <TitleTooltips />
          <ThemeColor />
        </ThemeProvider>
        {/* Vercel sets VERCEL=1 on its builds and runtime; elsewhere (local,
            self-hosted `next start`) analytics has no endpoint to report to. */}
        {process.env.VERCEL ? <VercelInsights /> : null}
      </body>
    </html>
  );
}
