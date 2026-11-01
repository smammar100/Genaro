import { createClient } from "@/lib/supabase/client";
import { invalidate, withCache } from "@/lib/cache";
import type { CompanyLocation, UUID } from "@/lib/types";

const NS = "company-locations:";

const SELECT = `
  id,
  companyId:company_id,
  slug,
  label,
  sortOrder:sort_order,
  archivedAt:archived_at,
  createdAt:created_at
`;

/**
 * A company's own vehicle locations (0056), beside the built-in ones. Removing
 * one archives it, so movement history keeps its name; the database refuses
 * while a car is still there.
 */
export const companyLocationService = {
  /** Every place the company has added, removed ones included, in order. */
  async getAll(companyId: UUID): Promise<CompanyLocation[]> {
    return withCache(`${NS}all:${companyId}`, async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("company_locations" as never)
        .select(SELECT)
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CompanyLocation[];
    });
  },

  async create(companyId: UUID, label: string, sortOrder: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("company_locations" as never)
      .insert({ company_id: companyId, label: label.trim(), sort_order: sortOrder } as never);
    if (error) throw friendly(error);
    invalidate(NS);
  },

  async rename(id: UUID, label: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("company_locations" as never)
      .update({ label: label.trim() } as never)
      .eq("id", id);
    if (error) throw friendly(error);
    invalidate(NS);
  },

  async archive(id: UUID): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("company_locations" as never)
      .update({ archived_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw friendly(error);
    invalidate(NS);
  },
};

/** The database's refusals, in words a person can act on. */
function friendly(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") return new Error("There is already a location with that name.");
  if (error.code === "23514") return new Error(error.message ?? "That change isn't allowed.");
  return new Error(error.message ?? "Couldn't save the location.");
}
