import { EmptyState } from "@/components/genaro";

/**
 * Any URL with no page. Without this Next renders its own 404 in system-ui;
 * this one keeps Geist and the app's scale (call 2026-11-01).
 */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-(--bg) p-6">
      <div className="w-full max-w-md">
        <EmptyState
          icon="SearchMinor"
          heading="Page not found"
          action={{ content: "Go to home", url: "/dashboard" }}
        >
          The link may be old, or the page may have moved.
        </EmptyState>
      </div>
    </main>
  );
}
