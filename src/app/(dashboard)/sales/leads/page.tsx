import { redirect } from "next/navigation";

/**
 * Leads are taken on the sales pipeline now, where a lead opens its deal in
 * New lead (call 2026-10-31). Old links and bookmarks land there.
 */
export default function LeadsPage() {
  redirect("/sales/pipeline");
}
