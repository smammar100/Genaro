import { notFound } from "next/navigation";
import { PHOTOS_ENABLED } from "@/lib/phase-one";

/**
 * Photo processing is hidden from the nav (sidebar-config); while photos are
 * off (Phase 1, see phase-one) its URL is a 404 as well, so no page shows car
 * photos.
 */
export default function PhotoProcessingLayout({ children }: { children: React.ReactNode }) {
  if (!PHOTOS_ENABLED) notFound();
  return children;
}
