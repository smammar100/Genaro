import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Suspense } from "react";
import "./globals.css";
// After globals so `.polaris` wins over the :root token layer (same
// specificity, later source). Generated from @shopify/polaris-tokens.
import "./polaris-theme.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { VercelInsights } from "@/components/vercel-insights";
import { getInitialAuth } from "@/lib/auth-initial";
import { AuthBoundary } from "@/components/layout/auth-boundary";

// UI font is Inter — the Shopify admin's typeface (self-hosted by next/font,
// exposed as --font-inter; polaris-theme.css makes it --font-sans).
// Geist Mono (--font-geist-mono) covers stock IDs, regs and other codes.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
        // Shopify Polaris visual language, app-wide (src/app/polaris-theme.css).
        "polaris",
        inter.variable,
        GeistMono.variable,
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
        {/* forcedTheme, not just a changed default: Genaro is a single light
            system, and anyone who picked dark before the migration still has
            `theme=dark` in localStorage. Without forcing, next-themes would
            restore that class — re-activating the `dark:` utilities still
            present in component files against a token layer that no longer has
            dark values. Forcing pins <html> to `light` and ignores the stored
            preference. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          forcedTheme="light"
        >
          <Suspense
            fallback={
              <AuthProvider initialUser={null} initialCompany={null}>
                <NotificationsProvider>
                  <TooltipProvider delay={150}>{children}</TooltipProvider>
                </NotificationsProvider>
              </AuthProvider>
            }
          >
            <AuthBoundary authPromise={authPromise}>{children}</AuthBoundary>
          </Suspense>
          <Toaster />
        </ThemeProvider>
        {/* Vercel sets VERCEL=1 on its builds and runtime; elsewhere (local,
            self-hosted `next start`) analytics has no endpoint to report to. */}
        {process.env.VERCEL ? <VercelInsights /> : null}
      </body>
    </html>
  );
}
