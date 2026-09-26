"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Mail, Phone, StickyNote, X, type LucideIcon } from "lucide-react";
import { Badge, Button, Card } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { dayLabel, fromISO, type CalEvent } from "@/lib/calendar-model";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { KIND_META, eventStatus, timeText } from "./event-meta";

const WIDTH = 360;
const GAP = 8;
const EDGE = 12;

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 body-md">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-(--icon-secondary)" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * An event's details in a card beside it, rather than a modal over the whole
 * calendar. It opens to the right of the event (left when there's no room),
 * takes focus, and closes on Escape, a click outside, scrolling or resizing.
 * Escape and the close button hand focus back to the event.
 */
export function EventPopover({
  ev,
  anchor,
  busy,
  onClose,
  onEdit,
  onMarkDone,
}: {
  ev: CalEvent;
  anchor: HTMLElement;
  busy: boolean;
  onClose: () => void;
  onEdit: (ev: CalEvent) => void;
  onMarkDone: (ev: CalEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const meta = KIND_META[ev.kind];
  const status = eventStatus(ev);

  const dismiss = useCallback(
    (returnFocus: boolean) => {
      onClose();
      if (returnFocus && anchor.isConnected) anchor.focus({ preventScroll: true });
    },
    [anchor, onClose],
  );

  // Place it beside the event, inside the viewport, then take focus.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.right + GAP;
    if (left + w > vw - EDGE) left = r.left - GAP - w;
    if (left < EDGE) left = Math.min(Math.max(EDGE, r.left + r.width / 2 - w / 2), vw - EDGE - w);
    const top = Math.max(EDGE, Math.min(r.top, vh - EDGE - h));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.visibility = "visible";
    el.focus({ preventScroll: true });
  }, [anchor, ev.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      dismiss(true);
    };
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      dismiss(false);
    };
    const onResize = () => dismiss(false);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor.contains(target)) return;
      // A click on an empty slot only closes the details; it shouldn't also
      // start a booking. Clicking another event still opens that event.
      if (target instanceof Element && target.closest("[data-calendar-slot]")) {
        const swallow = (click: MouseEvent) => {
          click.stopPropagation();
          click.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        window.addEventListener(
          "pointerup",
          () => setTimeout(() => window.removeEventListener("click", swallow, true), 0),
          { once: true },
        );
      }
      dismiss(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [anchor, dismiss]);

  const phone = ev.kind === "appt" || ev.kind === "workshop" ? ev.raw.customerPhone : null;
  const email = ev.kind === "appt" ? ev.raw.customerEmail : null;
  const notes = ev.kind === "appt" ? ev.raw.specialRequirements : ev.raw.notes;
  const canMarkDone = ev.kind !== "appt" && ev.raw.status !== "completed";
  const open =
    ev.kind === "maint"
      ? { label: "Open job", url: `/maintenance/jobs/${ev.id}` }
      : ev.kind === "workshop"
        ? { label: "Open workshop", url: "/maintenance/workshop" }
        : null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${meta.singular}: ${ev.title}`}
      tabIndex={-1}
      className="fixed z-[400] max-w-[calc(100vw-24px)] rounded-(--radius-300) shadow-(--shadow-500) outline-none"
      style={{ width: WIDTH, left: 0, top: 0, visibility: "hidden" }}
    >
      <Card padding="0">
        <div className="flex items-center gap-2 border-b border-(--border-secondary) py-2 pr-2 pl-4">
          <span aria-hidden className={`size-2.5 shrink-0 rounded-(--radius-full) ${meta.accent}`} />
          <span className="min-w-0 flex-1 truncate body-md-semibold">{meta.singular}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
          <Button variant="tertiary" icon={<X className="size-4" />} accessibilityLabel="Close" onClick={() => dismiss(true)} />
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <p className="heading-md">{ev.title}</p>
            {ev.job ? <p className="body-md text-(--text-secondary)">{ev.job}</p> : null}
          </div>
          <Fact icon={CalendarDays}>{dayLabel(fromISO(ev.date))}</Fact>
          <Fact icon={Clock}>{ev.allDay ? "All day · no time booked" : timeText(ev)}</Fact>
          {phone ? <Fact icon={Phone}>{phone}</Fact> : null}
          {email ? <Fact icon={Mail}>{email}</Fact> : null}
          {ev.reg || ev.car ? (
            <div className="flex items-center gap-2 rounded-(--radius-200) border border-(--border-secondary) p-2">
              {ev.reg ? <RegPlate registration={ev.reg} size="sm" /> : null}
              <span className="min-w-0 flex-1 truncate body-md">{ev.car}</span>
              {ev.vehicleId ? (
                <Button variant="plain" url={vehicleDetailHref(ev.vehicleId, pathname)}>
                  Open vehicle
                </Button>
              ) : null}
            </div>
          ) : null}
          {notes ? (
            <Fact icon={StickyNote}>
              <span className="whitespace-pre-wrap">{notes}</span>
            </Fact>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-(--border-secondary) px-4 py-3">
          <Button variant="primary" onClick={() => onEdit(ev)}>
            {ev.kind === "appt" ? "Edit appointment" : "Edit job"}
          </Button>
          {canMarkDone ? (
            <Button loading={busy} onClick={() => onMarkDone(ev)}>
              Mark as done
            </Button>
          ) : null}
          {open ? (
            <span className="ml-auto">
              <Button variant="plain" url={open.url}>
                {open.label}
              </Button>
            </span>
          ) : null}
        </div>
      </Card>
    </div>,
    document.body,
  );
}
