"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preserved through to the arrival form (e.g. a dealer-partner pre-pick). */
  extraParams?: Record<string, string>;
}

/**
 * Add Vehicle pre-entry modal. Captures registration + mileage up front so the
 * arrival form can run the DVLA + AutoTrader lookup in one shot. "Continue
 * manually" skips the lookup and opens a blank form.
 */
export function AddVehicleModal({ open, onOpenChange, extraParams }: Props) {
  const router = useRouter();
  const regInputRef = useRef<HTMLInputElement>(null);
  const regId = useId();
  const mileageId = useId();
  const mileageHintId = `${mileageId}-hint`;
  const [reg, setReg] = useState("");
  const [mileage, setMileage] = useState("");
  const [navigating, setNavigating] = useState(false);

  const cleanedReg = reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const canLookup = cleanedReg.length >= 4 && cleanedReg.length <= 8;

  function go(withLookup: boolean) {
    if (withLookup && !canLookup) {
      regInputRef.current?.focus();
      return;
    }
    const params = new URLSearchParams(extraParams ?? {});
    if (withLookup) {
      params.set("reg", cleanedReg);
      const m = Number(mileage);
      if (Number.isFinite(m) && m > 0)
        params.set("mileage", String(Math.round(m)));
    }
    const qs = params.toString();
    setNavigating(true);
    router.push(`/inventory/add-vehicle${qs ? `?${qs}` : ""}`);
    // Close after kicking off navigation (also resets state for a clean re-open).
    onOpenChange(false);
  }

  function reset() {
    setReg("");
    setMileage("");
    setNavigating(false);
  }

  return (
    <Dialog
      open={open}
      // Fires on user-initiated close (backdrop / Esc / close button) — sync
      // React state so the controlled `open` prop doesn't re-open it.
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onOpenChange(false);
        }
      }}
      // Also reset after a programmatic close (e.g. go() → onOpenChange(false)),
      // which doesn't route through onOpenChange above.
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
      <DialogContent aria-label="Add a vehicle">
        <DialogHeader>
          <DialogTitle>Add a vehicle</DialogTitle>
          <DialogDescription>
            Start a new stock record, look it up automatically or enter it by
            hand.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Enter the registration and mileage; we&apos;ll pull make, model,
              derivative, tax, MOT and an AutoTrader valuation automatically.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={regId}>Registration</Label>
                <Input
                  id={regId}
                  ref={regInputRef}
                  value={reg}
                  onChange={(e) => setReg(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canLookup) go(true);
                  }}
                  placeholder="EK18 FUT"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono uppercase"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={mileageId}>Mileage</Label>
                <Input
                  id={mileageId}
                  type="number"
                  inputMode="numeric"
                  aria-describedby={mileageHintId}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canLookup) go(true);
                  }}
                  placeholder="e.g. 45000"
                />
                <p id={mileageHintId} className="text-xs text-muted-foreground">
                  Needed for an accurate AutoTrader valuation.
                </p>
              </div>
            </div>
          </div>
        </DialogPanel>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => go(false)}
            disabled={navigating}
          >
            Continue manually
          </Button>
          <Button onClick={() => go(true)} loading={navigating}>
            {!navigating && <Search />}
            Look up &amp; continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
