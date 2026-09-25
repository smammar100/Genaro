"use client";

import { useEffect } from "react";
import "./globals.css";
import { Button } from "@/components/polaris";

/**
 * Last-resort boundary for errors thrown in the root layout itself (which
 * `(dashboard)/error.tsx` cannot catch). It replaces the root layout when
 * active, so it renders its own <html>/<body> and imports the global
 * stylesheet itself — the Polaris tokens and components then apply as usual.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="heading-md mb-2 text-(--text)">Something went wrong</h2>
          <p className="body-md mb-5 text-(--text-secondary)">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
