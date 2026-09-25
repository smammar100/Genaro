"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Page, TextField } from "@/components/polaris";
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
    // Polaris empty-state anatomy: a centred card, heading-sm title, body-md
    // secondary copy, one primary action.
    <Page>
      <div className="mx-auto flex w-full max-w-[784px] flex-col gap-4">
        <div className="flex items-center gap-2">
          {company?.logoMarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoMarkUrl}
              alt=""
              className="size-6 rounded-(--radius-200) object-contain"
            />
          ) : null}
          <h1 className="heading-lg text-(--text)">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
        </div>

        <Card>
          <div className="px-2 py-6 text-center">
            <h2 className="heading-sm text-(--text)">Start with a registration</h2>
            <p className="body-md mx-auto mt-1 max-w-[52ch] text-(--text-secondary)">
              Type the plate and we&apos;ll pull the make, model, derivative, tax
              and MOT for you. Everything else in{" "}
              {company?.name ?? "Car Capital UK"} hangs off that first car.
            </p>

            <form
              className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                go(true);
              }}
            >
              {/* The plate is the control: a UK number plate (plate yellow is
                  the one colour outside Polaris), not a generic field. */}
              <div className="flex h-8 items-stretch overflow-hidden rounded-(--radius-200) border border-(--input-border) bg-plate focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-(--border-focus)">
                <span
                  aria-hidden
                  className="flex w-7 shrink-0 items-center justify-center bg-(--bg-fill-emphasis) text-2xs font-bold text-(--text-emphasis-on-bg-fill)"
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
                  className="w-40 bg-transparent text-center font-mono text-base font-semibold uppercase text-(--text-caution-on-bg-fill) outline-none placeholder:font-medium placeholder:text-(--text-caution-on-bg-fill)/40"
                />
              </div>

              <div className="w-40 text-left sm:w-28">
                <TextField
                  label="Mileage"
                  labelHidden
                  value={mileage}
                  onChange={setMileage}
                  placeholder="Mileage"
                  inputMode="numeric"
                />
              </div>

              <Button
                variant="primary"
                submit
                disabled={!canLookup}
                loading={going}
              >
                Look up
              </Button>
            </form>

            <div className="mt-4">
              <Button variant="plain" onClick={() => go(false)}>
                Don&apos;t have the plate? Enter it by hand
              </Button>
            </div>
          </div>
        </Card>

        <Card title="How stock moves">
          <ol className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LIFECYCLE.map((stage, i) => (
              <li
                key={stage}
                className="body-md flex items-center gap-2 rounded-(--radius-200) bg-(--bg-surface-secondary) px-3 py-2"
              >
                <span className="body-sm text-(--text-secondary) tabular-nums">
                  {i + 1}
                </span>
                <span className="text-(--text)">{stage}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Page>
  );
}
