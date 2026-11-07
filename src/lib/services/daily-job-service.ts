import { createClient } from "@/lib/supabase/client";
import { invalidate, withCache } from "@/lib/cache";
import type { DailyJob, DailyJobPriority, UUID } from "@/lib/types";

const NS = "daily-jobs:";

const SELECT = `
  id,
  companyId:company_id,
  jobDate:job_date,
  title,
  registration,
  priority,
  status,
  createdBy:created_by,
  assignedTo:assigned_to,
  pickedUpBy:picked_up_by,
  pickedUpAt:picked_up_at,
  completedBy:completed_by,
  completedAt:completed_at,
  createdAt:created_at
`;

/** "ls68nyy" → "LS68 NYY"; other shapes are kept as typed, upper-cased. */
function formatRegistration(reg: string): string | null {
  const r = reg.replace(/\s+/g, "").toUpperCase();
  if (!r) return null;
  const current = r.match(/^([A-Z]{2}\d{2})([A-Z]{3})$/);
  return current ? `${current[1]} ${current[2]}` : r;
}

/** A plate has letters and digits, 2 to 8 characters once the spaces go. */
export function registrationError(reg: string): string | undefined {
  const r = reg.replace(/\s+/g, "").toUpperCase();
  if (!r) return undefined;
  if (r.length < 2 || r.length > 8 || !/[A-Z]/.test(r) || !/\d/.test(r) || /[^A-Z0-9]/.test(r)) {
    return "Enter a reg like LS68 NYY, or leave it blank";
  }
  return undefined;
}

/**
 * The team's day sheet of small jobs (0061). Anyone posts one; staff pick it
 * up and complete it. Every write returns the saved row so the sheet can
 * update in place.
 */
export const dailyJobService = {
  async getForDay(companyId: UUID, jobDate: string): Promise<DailyJob[]> {
    return withCache(`${NS}${companyId}:${jobDate}`, async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_jobs")
        .select(SELECT)
        .eq("company_id", companyId)
        .eq("job_date", jobDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DailyJob[];
    });
  },

  async add(input: {
    companyId: UUID;
    jobDate: string;
    title: string;
    registration?: string;
    priority: DailyJobPriority;
    createdBy: UUID;
    /** A staff member, or null to leave the job open to anyone. */
    assignedTo?: UUID | null;
  }): Promise<DailyJob> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_jobs")
      .insert({
        company_id: input.companyId,
        job_date: input.jobDate,
        title: input.title.trim(),
        registration: input.registration ? formatRegistration(input.registration) : null,
        priority: input.priority,
        created_by: input.createdBy,
        assigned_to: input.assignedTo ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    invalidate(NS);
    return data as unknown as DailyJob;
  },

  async setPriority(id: UUID, priority: DailyJobPriority): Promise<DailyJob> {
    return update(id, { priority });
  },

  /** Give the job to a staff member, or null to open it to anyone. Doesn't pick it up. */
  async assign(id: UUID, userId: UUID | null): Promise<DailyJob> {
    return update(id, { assigned_to: userId });
  },

  async pickUp(id: UUID, userId: UUID): Promise<DailyJob> {
    return update(id, { picked_up_by: userId, picked_up_at: new Date().toISOString() });
  },

  async complete(id: UUID, userId: UUID): Promise<DailyJob> {
    return update(id, { status: "completed", completed_by: userId, completed_at: new Date().toISOString() });
  },

  /** Back to pending, still with whoever had picked it up. */
  async reopen(id: UUID): Promise<DailyJob> {
    return update(id, { status: "pending", completed_by: null, completed_at: null });
  },

  /** Only the poster can delete, and only while it's pending (RLS enforces both). */
  async remove(id: UUID): Promise<void> {
    const supabase = createClient();
    const { error, count } = await supabase.from("daily_jobs").delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("Only the person who posted a job can delete it, and only before it's done.");
    invalidate(NS);
  },
};

async function update(
  id: UUID,
  patch: {
    priority?: DailyJobPriority;
    assigned_to?: UUID | null;
    status?: "pending" | "completed";
    picked_up_by?: UUID | null;
    picked_up_at?: string | null;
    completed_by?: UUID | null;
    completed_at?: string | null;
  },
): Promise<DailyJob> {
  const supabase = createClient();
  const { data, error } = await supabase.from("daily_jobs").update(patch).eq("id", id).select(SELECT).single();
  if (error) throw error;
  invalidate(NS);
  return data as unknown as DailyJob;
}
