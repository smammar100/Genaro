"use client";

import { useEffect } from "react";
import { Button, EmptyState } from "@/components/polaris";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  // Next 16.2 renamed the recovery prop reset → unstable_retry (re-fetches
  // + re-renders the segment, not just a state reset).
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon="AlertMinor"
        heading="Something went wrong"
        action={{ content: "Try again", onAction: () => unstable_retry() }}
        secondaryAction={{ content: "Reload page", onAction: () => window.location.reload() }}
        footerContent={
          <Button variant="plain" url="/dashboard">
            Back to dashboard
          </Button>
        }
      >
        {error.message || "An unexpected error occurred."}
      </EmptyState>
    </div>
  );
}
