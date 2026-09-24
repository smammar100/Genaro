"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/** The four stages a car passes through, in the order the sidebar lists them. */
const LIFECYCLE = ["Arrives", "Inspected", "Prepped", "Sold"];

/**
 * First-run screen, shown in place of the dashboard while there is not a
 * single vehicle on the system. The nav rail is hidden around it (see the
 * dashboard layout) so the whole window is this one question.
 *
 * WHY THE PLATE IS THE CONTROL, NOT A BUTTON
 * Every other empty state describes the action; this one IS the action. A
 * dealer's instinct with a new car is to reach for the registration, and a UK
 * plate is the one control that already looks like the thing in their hand.
 * Typing it and pressing Enter goes straight to the arrival form with the DVLA
 * and AutoTrader lookup already running — the Add Vehicle dialog, which exists
 * only to collect these same two fields, never has to open.
 *
 * There is deliberately no tour offered here. The tour highlights nav items,
 * and this is the one screen with no nav to highlight.
 */
export function DashboardWelcome() {
  const router = useRouter();
  const { user, company } = useAuth();
  const [reg, setReg] = React.useState("");
  const [mileage, setMileage] = React.useState("");
  const [going, setGoing] = React.useState(false);

  // Same normalisation and bounds the Add Vehicle dialog applies, so the two
  // entry points accept exactly the same registrations.
  const cleanedReg = reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const canLookup = cleanedReg.length >= 4 && cleanedReg.length <= 8;

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;

  function go(withLookup: boolean): void {
    if (withLookup && !canLookup) return;
    const params = new URLSearchParams();
    if (withLookup) {
      params.set("reg", cleanedReg);
      const m = Number(mileage);
      if (Number.isFinite(m) && m > 0) params.set("mileage", String(Math.round(m)));
    }
    const qs = params.toString();
    setGoing(true);
    router.push(`/inventory/add-vehicle${qs ? `?${qs}` : ""}`);
  }

  return (
    // Shopify admin empty state: centred white card, 14px/600 title, 13px
    // muted copy, one primary action.
    <div className="mx-auto flex w-full max-w-[784px] flex-col gap-4 pt-4">
      <div className="flex items-center gap-2">
        {company?.logoMarkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoMarkUrl}
            alt=""
            className="size-6 rounded-md object-contain"
          />
        ) : null}
        <h1 className="text-xl font-semibold text-foreground">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
      </div>

      <div className="rounded-xl border border-[#e3e3e3] bg-card px-6 py-10 text-center shadow-[0_1px_0_rgba(0,0,0,.05)]">
        <h2 className="text-sm font-semibold text-foreground">
          Start with a registration
        </h2>
        <p className="mx-auto mt-1 max-w-[52ch] text-[13px] text-muted-foreground">
          Type the plate and we&apos;ll pull the make, model, derivative, tax and
          MOT for you. Everything else in {company?.name ?? "Car Capital UK"}{" "}
          hangs off that first car.
        </p>

        <form
          className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            go(true);
          }}
        >
          <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-[#8a8a8a] bg-[#ffd400] focus-within:ring-2 focus-within:ring-ring">
            <span
              aria-hidden
              className="flex w-7 shrink-0 items-center justify-center bg-[#0b3fbf] text-[9px] font-bold text-white"
            >
              GB
            </span>
            <input
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="AK69 HZH"
              aria-label="Registration"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="w-[160px] bg-transparent text-center font-mono text-[15px] font-semibold uppercase text-[#101010] outline-none placeholder:font-medium placeholder:text-black/35"
            />
          </div>

          <input
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="Mileage"
            inputMode="numeric"
            aria-label="Mileage"
            className="h-9 w-[160px] rounded-lg border border-[#8a8a8a] bg-white px-3 text-[13px] text-foreground outline-none placeholder:text-[#616161] focus:ring-2 focus:ring-ring sm:w-[110px]"
          />

          <Button type="submit" disabled={!canLookup || going}>
            {going ? "Opening…" : "Look up"}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <button
          type="button"
          onClick={() => go(false)}
          className="mt-4 text-[13px] text-[#005bd3] hover:underline"
        >
          Don&apos;t have the plate? Enter it by hand
        </button>
      </div>

      <div className="rounded-xl border border-[#e3e3e3] bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,.05)]">
        <h2 className="text-sm font-semibold text-foreground">How stock moves</h2>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LIFECYCLE.map((stage, i) => (
            <li
              key={stage}
              className="flex items-center gap-2 rounded-lg bg-[#f7f7f7] px-3 py-2 text-[13px]"
            >
              <span className="text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="font-medium text-foreground">{stage}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
