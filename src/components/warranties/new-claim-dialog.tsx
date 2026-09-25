"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { claimService } from "@/lib/services/claim-service";
import { warrantyService } from "@/lib/services/warranty-service";
import type { Warranty } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, InlineError } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const schema = z.object({
  warrantyId: z.string().min(1, "Pick a warranty"),
  issueDescription: z.string().min(5, "Describe the issue"),
  estimatedCost: z.coerce.number().min(0).optional(),
  isComplaint: z.boolean(),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface NewClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the warranty selector is hidden and locked to this id. */
  warrantyId?: string;
  onCreated?: () => void;
}

export function NewClaimDialog({
  open,
  onOpenChange,
  warrantyId,
  onCreated,
}: NewClaimDialogProps) {
  const { user, company } = useAuth();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const baseId = useId();
  const warrantyFieldId = `${baseId}-warranty`;
  const issueDescriptionId = `${baseId}-issue-description`;
  const estimatedCostId = `${baseId}-estimated-cost`;
  const isComplaintId = `${baseId}-is-complaint`;

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      warrantyId: warrantyId ?? "",
      issueDescription: "",
      estimatedCost: 0,
      isComplaint: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        warrantyId: warrantyId ?? "",
        issueDescription: "",
        estimatedCost: 0,
        isComplaint: false,
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warrantyId]);

  useEffect(() => {
    if (!company || !open) return;
    void warrantyService
      .getByStatus(company.id, ["active"])
      .then(setWarranties);
  }, [company, open]);

  const selectedId = form.watch("warrantyId");
  const isComplaint = form.watch("isComplaint");
  const selected = useMemo(
    () => warranties.find((w) => w.id === selectedId) ?? null,
    [warranties, selectedId],
  );

  async function onSubmit(values: FormOutput) {
    if (!user) return;
    const w = warranties.find((x) => x.id === values.warrantyId);
    if (!w) {
      toast.error("Warranty not found");
      return;
    }
    try {
      await claimService.create(
        {
          warrantyId: values.warrantyId,
          vehicleId: w.vehicleId,
          companyId: w.companyId,
          customerName: w.customerName,
          issueDescription: values.issueDescription,
          isComplaint: values.isComplaint,
          estimatedCost: values.estimatedCost ?? null,
        },
        user.id,
      );
      toast.success("Claim filed");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to file claim");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File a claim</DialogTitle>
          <DialogDescription>
            Open a warranty claim against an active warranty.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-6"
        >
          {!warrantyId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={warrantyFieldId}>Warranty</Label>
              <Combobox
                items={warranties}
                value={selected}
                onValueChange={(w: Warranty | null) =>
                  form.setValue("warrantyId", w?.id ?? "", {
                    shouldValidate: true,
                  })
                }
                itemToStringLabel={(w: Warranty) =>
                  `${w.customerName} · ${w.type === "external" ? w.provider : "In-house"}`
                }
              >
                <ComboboxInput
                  id={warrantyFieldId}
                  placeholder="Pick an active warranty"
                  startAddon={<Search />}
                  className="w-full"
                />
                <ComboboxPopup>
                  <ComboboxEmpty>No active warranties.</ComboboxEmpty>
                  <ComboboxList>
                    {(w: Warranty) => (
                      <ComboboxItem key={w.id} value={w}>
                        <div className="flex flex-col">
                          <span className="body-md">{w.customerName}</span>
                          <span className="body-sm text-(--text-secondary)">
                            {w.type === "external" ? w.provider : "In-house"} ·{" "}
                            {w.startDate} → {w.endDate}
                          </span>
                        </div>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
              {form.formState.errors.warrantyId?.message && (
                <InlineError message={form.formState.errors.warrantyId.message} />
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={issueDescriptionId}>Issue description</Label>
            <Textarea
              id={issueDescriptionId}
              {...form.register("issueDescription")}
              placeholder="What's the customer reporting?"
              className="min-h-24"
            />
            {form.formState.errors.issueDescription?.message && (
              <InlineError message={form.formState.errors.issueDescription.message} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={estimatedCostId}>Estimated cost (£)</Label>
            <Input
              id={estimatedCostId}
              type="number"
              step="0.01"
              {...form.register("estimatedCost")}
            />
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 rounded-(--radius-300) border p-3 transition-colors",
              isComplaint
                ? "border-(--border-critical) bg-(--bg-surface-critical)"
                : "border-(--border) bg-(--bg-surface)",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-4 w-4",
                    isComplaint
                      ? "text-(--icon-critical)"
                      : "text-(--icon-secondary)",
                  )}
                />
                <div>
                  <Label htmlFor={isComplaintId} className="body-md">
                    Flag as customer complaint
                  </Label>
                  <p className="body-sm mt-0.5 text-(--text-secondary)">
                    Escalates SLA and flags the claim row red in the claims
                    list.
                  </p>
                </div>
              </div>
              <Switch
                id={isComplaintId}
                checked={isComplaint}
                onCheckedChange={(v) =>
                  form.setValue("isComplaint", v, { shouldDirty: true })
                }
              />
            </div>
          </div>

          <DialogFooter className="-mx-6 mt-2">
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              submit
              loading={form.formState.isSubmitting}
            >
              File claim
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
