"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, type Transition } from "framer-motion";
import { Ellipsis, EyeOff } from "lucide-react";
import { Button } from "@/components/genaro";
import { RowActionButton } from "@/components/ui/resource-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCardContext } from "./kanban-card";
import { StageIcon, type KanbanColumn } from "./stage-icon";

interface KanbanRenderContext {
  column: KanbanColumn;
  columns: KanbanColumn[];
}

interface KanbanBoardProps<T> {
  /** Names this board's saved display choice (its hidden columns). */
  id: string;
  columns: KanbanColumn[];
  items: T[];
  getId: (item: T) => string;
  getColumnId: (item: T) => string;
  /**
   * Order within a column. It also places the drop slot: the boards keep no
   * manual order, so the slot shows where the card will really land rather
   * than wherever the pointer happens to be.
   */
  compare?: (a: T, b: T, columnId: string) => number;
  /** The item as it will be once moved (a new status date, say), for placing the drop slot. */
  moved?: (item: T, columnId: string) => T;
  /** A drop into another column. The page saves it; update the items optimistically. */
  onMove: (id: string, columnId: string) => void;
  renderCard: (item: T, ctx: KanbanRenderContext) => React.ReactNode;
  /** The card's name for screen readers and the move announcements, e.g. the job's title. */
  getLabel?: (item: T) => string;
  /** Adds a card from the foot of a column. Leave out on boards that don't create cards. */
  onAdd?: (columnId: string) => void;
  /** Verb + noun for the add buttons, e.g. "Add job". */
  addLabel?: string;
  /** For counts and empty columns: { one: "job", many: "jobs" }. */
  noun: { one: string; many: string };
  /** Columns kept in the "Hidden columns" rail until the viewer shows them, e.g. Lost. */
  defaultHidden?: string[];
}

const storageKey = (board: string, what: "hidden") => `cc.kanban.${board}.${what}`;

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

/** Cards glide into place when one leaves or a slot opens: quick, no bounce. */
const GLIDE: Transition = { layout: { type: "spring", duration: 0.3, bounce: 0 } };
/** The carried card lifting off the board (React Bits' Kanban Board). */
const LIFT: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 };
/** Slots opening and counts ticking over. */
const FLOW: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };

/** Space between cards, and what a collapsed card pulls back so it leaves no gap. */
const CARD_GAP = "gap-2";
const PULL_UP = "-mt-2";
const PULL_DOWN = "-mb-2";

/** A mouse drag starts once the pointer has moved this far, so a click still opens the card. */
const DRAG_SLOP = 5;
/** On touch a card is picked up by pressing and holding it; moving first scrolls instead. */
const HOLD_MS = 300;
const HOLD_SLOP = 8;
/** Near either side of the board while dragging, it scrolls this many px a frame. */
const EDGE_PX = 72;
const EDGE_SPEED = 14;

/**
 * Runs the board down to the bottom of the scroll area, less the page's
 * bottom padding, so the columns scroll inside it and their headers stay in
 * view. Never shorter than `min`: on a short window the page scrolls instead.
 */
function useFillHeight(ref: React.RefObject<HTMLElement | null>, min: number): number | undefined {
  const [height, setHeight] = React.useState<number>();
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = el.closest<HTMLElement>(".p-frame__main");
    const measure = () => {
      const top = scroller
        ? el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
        : el.getBoundingClientRect().top + window.scrollY;
      const room = (scroller ? scroller.clientHeight : window.innerHeight) - top - 24;
      setHeight(Math.max(min, Math.round(room)));
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(scroller ?? document.documentElement);
    // Something above the board changing height (a toolbar wrapping) moves its top.
    if (el.parentElement) observer.observe(el.parentElement);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, min]);
  return height;
}

/**
 * Our own sideways scrollbar under the board (after React Bits' Kanban
 * Board): the native one is an overlay on most systems, hidden until you're
 * already scrolling, which is the moment you no longer need telling. This one
 * shows whenever there's more board to the side, and you can drag it.
 */
function ScrollRail({ trackRef }: { trackRef: React.RefObject<HTMLDivElement | null> }) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [geom, setGeom] = React.useState({ ratio: 1, offset: 0 });
  const [held, setHeld] = React.useState(false);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const sync = () => {
      const ratio = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
      const max = el.scrollWidth - el.clientWidth;
      setGeom({ ratio, offset: max > 0 ? el.scrollLeft / max : 0 });
    };
    el.addEventListener("scroll", sync, { passive: true });
    // The observer's first call measures, so nothing is set in the effect itself.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [trackRef]);

  const scrollTo = React.useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      const el = trackRef.current;
      if (!rail || !el) return;
      const r = rail.getBoundingClientRect();
      const thumb = r.width * geom.ratio;
      const p = (clientX - r.left - thumb / 2) / Math.max(1, r.width - thumb);
      el.scrollLeft = Math.max(0, Math.min(1, p)) * (el.scrollWidth - el.clientWidth);
    },
    [geom.ratio, trackRef],
  );

  React.useEffect(() => {
    if (!held) return;
    const onMove = (e: PointerEvent) => scrollTo(e.clientX);
    const onUp = () => setHeld(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [held, scrollTo]);

  if (geom.ratio >= 0.999) return null;
  return (
    <div
      ref={railRef}
      aria-hidden
      onPointerDown={(e) => {
        setHeld(true);
        scrollTo(e.clientX);
      }}
      className="mt-3 h-1.5 w-full shrink-0 cursor-pointer rounded-(--radius-full) bg-(--bg-fill-transparent)"
    >
      <div
        style={{ width: `${geom.ratio * 100}%`, marginLeft: `${geom.offset * (100 - geom.ratio * 100)}%` }}
        className={cn(
          "h-full rounded-(--radius-full) transition-colors",
          held ? "bg-(--icon-secondary)" : "bg-(--border-tertiary) hover:bg-(--icon-secondary)",
        )}
      />
    </div>
  );
}

/**
 * The board's frame: a card the columns sit in as rounded panels, running to
 * the foot of the window so each column scrolls on its own. It scrolls
 * sideways (a column at a time on a phone); whichever side still has columns
 * past the edge fades out, and a rail under it shows where you are.
 * @import import { KanbanFrame } from "@/components/kanban/kanban-board";
 */
export function KanbanFrame({
  children,
  className,
  trackRef,
}: {
  children: React.ReactNode;
  className?: string;
  /** The sideways-scrolling row of columns, for a board that scrolls it while dragging. */
  trackRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const ownTrack = React.useRef<HTMLDivElement>(null);
  const track = trackRef ?? ownTrack;
  const height = useFillHeight(ref, 416);
  const [edges, setEdges] = React.useState({ start: true, end: true });

  /** Which ends of the row still have columns past them. */
  const syncEdges = (el: HTMLElement) => {
    const start = el.scrollLeft < 8;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    setEdges((cur) => (cur.start === start && cur.end === end ? cur : { start, end }));
  };

  React.useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => syncEdges(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, [track]);

  const fade = "24px";
  const mask =
    edges.start && edges.end
      ? undefined
      : `linear-gradient(to right, transparent 0%, black ${edges.start ? "0%" : fade}, black ${edges.end ? "100%" : `calc(100% - ${fade})`}, transparent 100%)`;

  return (
    <div
      ref={ref}
      style={height ? { height } : undefined}
      className={cn("flex min-h-[26rem] flex-col rounded-(--radius-300) bg-(--kanban-board) p-3 shadow-(--shadow-100)", className)}
    >
      <motion.div
        ref={track}
        layoutScroll
        onScroll={(e) => syncEdges(e.currentTarget)}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] sm:snap-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </motion.div>
      <ScrollRail trackRef={track} />
    </div>
  );
}

type LaneProps = Omit<React.ComponentProps<typeof motion.section>, "children"> & {
  column: KanbanColumn;
  columns: KanbanColumn[];
  count: number;
  /** A second line under the name: the column's total, or what it's for. */
  summary?: string;
  /** Keep the summary's line even when this column has none, so card tops line up across the board. */
  reserveSummary?: boolean;
  /** The header's buttons, right: the column's "…" menu. */
  actions?: React.ReactNode;
  /** Under the cards: the column's add button. */
  footer?: React.ReactNode;
  /** A dragged card is over this column. */
  target?: boolean;
  children: React.ReactNode;
};

/**
 * One column, a rounded panel: a status badge, the name and a count chip that
 * ticks over as cards come and go, in a header that stays put while the cards
 * scroll under it (they fade out beneath it); then the cards, and the add
 * button at the foot. Also used by boards that don't drag (prep), so every
 * board shares the anatomy.
 * @import import { KanbanLane } from "@/components/kanban/kanban-board";
 */
export function KanbanLane({
  column,
  columns,
  count,
  summary,
  reserveSummary = false,
  actions,
  footer,
  target = false,
  className,
  style,
  children,
  ...rest
}: LaneProps) {
  return (
    <motion.section
      layoutScroll
      aria-label={column.label}
      {...rest}
      style={style}
      // The header's fade is painted in the lane's own colour, so a lane
      // tinted as a drop target fades into the tint rather than a band. A
      // class, not the style prop: framer-motion doesn't update a CSS
      // variable in `style` once it's set.
      className={cn(
        target ? "[--kanban-lane:var(--kanban-lane-target)]" : "[--kanban-lane:var(--kanban-lane-rest)]",
        "flex h-full w-[85vw] max-w-[340px] shrink-0 snap-start flex-col overflow-y-auto overscroll-y-contain rounded-(--radius-300) bg-(--kanban-lane) transition-colors duration-200 sm:w-[300px] lg:w-auto lg:min-w-[272px] lg:max-w-none lg:flex-1",
        className,
      )}
    >
      <header className="sticky top-0 z-20 flex min-w-0 shrink-0 items-start gap-2 bg-[linear-gradient(to_bottom,var(--kanban-lane)_calc(100%-12px),transparent)] px-3 pb-3 pt-3">
        <span className="flex h-6 shrink-0 items-center">
          <StageIcon column={column} columns={columns} variant="badge" />
        </span>
        {/* The total sits under the name rather than beside it, so a narrow
            column doesn't cut both. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-6 min-w-0 items-center gap-2">
            <h2 title={column.label} className="body-md-semibold truncate">
              {column.label}
            </h2>
            <motion.span
              key={count}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={FLOW}
              className="grid h-5 min-w-5 shrink-0 place-items-center rounded-(--radius-150) bg-(--bg-fill-transparent-hover) px-1.5 body-sm tabular-nums text-(--text-secondary)"
            >
              {count}
            </motion.span>
          </div>
          {summary || reserveSummary ? (
            <span className="body-sm truncate tabular-nums text-(--text-secondary)">{summary || " "}</span>
          ) : null}
        </div>
        {actions ? <span className="-mr-1 flex h-6 shrink-0 items-center gap-0.5">{actions}</span> : null}
      </header>
      {/* Never squeezed: the app zeroes every flex item's min-height, so
          without shrink-0 the list (and the cards in it) would crush to fit
          the column instead of scrolling. */}
      <div className={cn("flex shrink-0 flex-col px-3 [&>*]:shrink-0", CARD_GAP)}>{children}</div>
      {footer ? <div className="shrink-0 px-2 pt-2">{footer}</div> : null}
      {/* Room under the last card, and somewhere to drop at the foot of a full column. */}
      <div aria-hidden className="min-h-3 flex-1" />
    </motion.section>
  );
}

/**
 * A column with no cards: a dashed well that says so, with an action when the board has one.
 * @import import { KanbanEmpty } from "@/components/kanban/kanban-board";
 */
export function KanbanEmpty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[8.125rem] flex-col items-center justify-center gap-2 rounded-(--radius-300) border border-dashed border-(--border) px-4 py-6 text-center">
      <p className="body-sm text-(--text-secondary)">{children}</p>
      {action}
    </div>
  );
}

/**
 * The board while its data loads: the frame and lanes, with pulsing card shapes.
 * @import import { KanbanSkeleton } from "@/components/kanban/kanban-board";
 */
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <KanbanFrame>
      {Array.from({ length: columns }, (_, c) => (
        <div
          key={c}
          aria-busy
          className="flex h-full w-[85vw] max-w-[340px] shrink-0 flex-col gap-2 rounded-(--radius-300) bg-(--kanban-lane-rest) px-3 pt-3 sm:w-[300px] lg:w-auto lg:min-w-[272px] lg:max-w-none lg:flex-1"
        >
          <div className="mb-1 flex h-6 items-center gap-2">
            <Skeleton className="size-3.5 rounded-(--radius-100)" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: 3 - (c % 2) }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-(--radius-300)" />
          ))}
        </div>
      ))}
    </KanbanFrame>
  );
}

/** Where the dragged card will land: a dashed well of its height that springs open. */
function Slot({ height }: { height: number }) {
  return (
    <motion.div
      layout="position"
      transition={{ ...FLOW, ...GLIDE }}
      initial={{ opacity: 0, scaleY: 0.7 }}
      animate={{ opacity: 1, scaleY: 1 }}
      aria-hidden
      className="shrink-0 origin-top rounded-(--radius-300) border border-dashed border-(--border-tertiary) bg-(--bg-fill-transparent)"
      style={{ height }}
    />
  );
}

const noSubscribe = () => () => {};
const isBrowser = () => true;
const isServer = () => false;

type Drag = {
  id: string;
  from: string;
  width: number;
  height: number;
  /** Where inside the card the pointer took hold of it. */
  offsetX: number;
  offsetY: number;
  mode: "pointer" | "keyboard";
};

type Pending = {
  id: string;
  from: string;
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
  touch: boolean;
  timer?: number;
};

/**
 * The app's Kanban board, after React Bits' Kanban Board (2026-11-07):
 * columns as rounded panels on one card, soft white cards. Drag a card with
 * the pointer (press and hold on touch): it lifts out of its column and rides
 * the cursor, tilted; its old spot closes up, a dashed slot springs open where
 * it will land, the other cards slide aside, and the board scrolls when you
 * near its edge. From the keyboard, focus a card and press Space to pick it
 * up, the arrow keys to carry it to another column, Space to drop it and
 * Escape to put it back; each step is announced. Any column can be hidden to a
 * rail from its "…" menu (Lost starts there), and a card dropped on the rail
 * moves there; the choice persists. Pages own the data and the saving; the
 * board owns the layout.
 * @import import { KanbanBoard } from "@/components/kanban/kanban-board";
 */
export function KanbanBoard<T>({
  id,
  columns,
  items,
  getId,
  getColumnId,
  compare,
  moved,
  onMove,
  renderCard,
  getLabel,
  onAdd,
  addLabel,
  noun,
  defaultHidden = [],
}: KanbanBoardProps<T>) {
  const [hidden, setHidden] = React.useState<string[]>(defaultHidden);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  // The card just dropped, which settles into its new spot rather than popping in.
  const [landed, setLanded] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const reduceMotion = useReducedMotion();
  // The lifted card portals to <body>, which exists only in the browser; this
  // is false on the server and through hydration, then true.
  const onClient = React.useSyncExternalStore(noSubscribe, isBrowser, isServer);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<Drag | null>(null);
  const overRef = React.useRef<string | null>(null);
  const pendingRef = React.useRef<Pending | null>(null);
  const autoScroll = React.useRef(0);
  /** A card moved from the keyboard, to hand focus back to once it lands. */
  const refocus = React.useRef<string | null>(null);

  // The viewer's hidden columns, restored after mount so the server render and
  // the first client render agree (the vehicle sheets do the same).
  React.useEffect(() => {
    try {
      const savedHidden = localStorage.getItem(storageKey(id, "hidden"));
      const parsed: unknown = savedHidden === null ? null : JSON.parse(savedHidden);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHidden(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Storage blocked or a bad value: the defaults stand.
    }
  }, [id]);

  const updateHidden = (next: string[]) => {
    setHidden(next);
    save(storageKey(id, "hidden"), JSON.stringify(next));
  };

  const byColumn = new Map<string, T[]>(columns.map((c) => [c.id, []]));
  for (const item of items) byColumn.get(getColumnId(item))?.push(item);
  if (compare) for (const [columnId, list] of byColumn) list.sort((a, b) => compare(a, b, columnId));

  const shown = columns.filter((c) => !hidden.includes(c.id));
  const anySummary = shown.some((c) => c.summary);
  const hiddenColumns = columns.filter((c) => hidden.includes(c.id));
  const isTarget = (columnId: string) => drag !== null && over === columnId && drag.from !== columnId;
  // Over another column, the carried card leaves its own: its well closes up.
  const away = drag !== null && over !== null && isTarget(over);
  const labelOf = (item: T) => getLabel?.(item) ?? noun.one;

  // What the window listeners need from the latest render.
  const latest = React.useRef({ onMove, columns, shown, items, getId, labelOf });
  React.useLayoutEffect(() => {
    latest.current = { onMove, columns, shown, items, getId, labelOf };
  });

  const columnName = (columnId: string) => latest.current.columns.find((c) => c.id === columnId)?.label ?? columnId;
  const itemLabel = (itemId: string) => {
    const item = latest.current.items.find((x) => latest.current.getId(x) === itemId);
    return item ? latest.current.labelOf(item) : "Card";
  };

  /** Ends a drag; `commit` moves the card if it's over another column. */
  const finish = React.useCallback((commit: boolean) => {
    const d = dragRef.current;
    const to = overRef.current;
    if (commit && d && to && to !== d.from) {
      latest.current.onMove(d.id, to);
      setLanded(d.id);
      if (d.mode === "keyboard") refocus.current = d.id;
      setAnnouncement(`Moved ${itemLabel(d.id)} to ${columnName(to)}.`);
    } else if (d && d.mode === "keyboard") {
      refocus.current = d.id;
      setAnnouncement(`${itemLabel(d.id)} stays in ${columnName(d.from)}.`);
    }
    dragRef.current = null;
    overRef.current = null;
    autoScroll.current = 0;
    setDrag(null);
    setOver(null);
    // itemLabel and columnName read the latest render through a ref.
  }, []);

  // Pointer dragging: listeners on the window, so the card can be carried
  // anywhere, and reading the latest state through refs.
  React.useEffect(() => {
    const columnAt = (cx: number, cy: number): string | null => {
      const track = trackRef.current;
      if (!track) return null;
      const zones = Array.from(track.querySelectorAll<HTMLElement>("[data-kanban-drop]"));
      let nearest: string | null = null;
      let best = Infinity;
      for (const el of zones) {
        const r = el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return el.dataset.kanbanDrop ?? null;
        if (el.dataset.kanbanRail !== undefined) continue;
        const dx = Math.abs(cx - (r.left + r.width / 2));
        if (dx < best) {
          best = dx;
          nearest = el.dataset.kanbanDrop ?? null;
        }
      }
      return nearest;
    };

    const begin = (p: Pending, cx: number, cy: number) => {
      window.clearTimeout(p.timer);
      pendingRef.current = null;
      const d: Drag = {
        id: p.id,
        from: p.from,
        width: p.rect.width,
        height: p.rect.height,
        offsetX: p.startX - p.rect.left,
        offsetY: p.startY - p.rect.top,
        mode: "pointer",
      };
      x.set(cx - d.offsetX);
      y.set(cy - d.offsetY);
      dragRef.current = d;
      overRef.current = p.from;
      setDrag(d);
      setOver(p.from);
    };

    const cancelPending = () => {
      const p = pendingRef.current;
      if (p) window.clearTimeout(p.timer);
      pendingRef.current = null;
    };

    const onMovePointer = (e: PointerEvent) => {
      const p = pendingRef.current;
      if (p && e.pointerId === p.pointerId) {
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        if (p.touch) {
          // Moving before the hold is up is a scroll, not a drag.
          if (dist > HOLD_SLOP) cancelPending();
        } else if (dist > DRAG_SLOP) {
          begin(p, e.clientX, e.clientY);
        }
        return;
      }
      const d = dragRef.current;
      if (!d || d.mode !== "pointer") return;
      x.set(e.clientX - d.offsetX);
      y.set(e.clientY - d.offsetY);
      const target = columnAt(e.clientX, e.clientY);
      if (target && target !== overRef.current) {
        overRef.current = target;
        setOver(target);
      }
      const track = trackRef.current;
      if (track) {
        const r = track.getBoundingClientRect();
        autoScroll.current = e.clientX < r.left + EDGE_PX ? -EDGE_SPEED : e.clientX > r.right - EDGE_PX ? EDGE_SPEED : 0;
      }
    };

    const onUp = () => {
      if (pendingRef.current) {
        // A click, not a drag: let it open the card.
        cancelPending();
        return;
      }
      if (dragRef.current?.mode !== "pointer") return;
      finish(true);
      // The click that ends a drag shouldn't also open the card it ends on.
      const swallow = (click: MouseEvent) => {
        click.stopPropagation();
        click.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, true), 0);
    };

    const onCancel = () => {
      cancelPending();
      if (dragRef.current?.mode === "pointer") finish(false);
    };

    // Once a card is carried on touch, the finger moves the card, not the page.
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current?.mode === "pointer") e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragRef.current?.mode === "pointer") finish(false);
    };

    window.addEventListener("pointermove", onMovePointer);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMovePointer);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish, x, y]);

  // Nudge the board along while a card is carried near either side.
  const carrying = drag?.mode === "pointer";
  React.useEffect(() => {
    if (!carrying) return;
    let frame = 0;
    const tick = () => {
      if (autoScroll.current && trackRef.current) trackRef.current.scrollLeft += autoScroll.current;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [carrying]);

  // A keyboard move re-mounts the card in its new column, which drops focus;
  // put it back on the card.
  React.useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const el = trackRef.current?.querySelector<HTMLElement>(`[data-kanban-item="${CSS.escape(target)}"]`);
    el?.focus({ preventScroll: false });
  }, [items, drag]);

  /** Index among the column's other cards where the dragged card will land. */
  function slotIndex(columnId: string, list: T[]): number {
    if (!drag || !isTarget(columnId)) return -1;
    const rest = list.filter((x) => getId(x) !== drag.id);
    const item = items.find((x) => getId(x) === drag.id);
    if (!item || !compare) return rest.length;
    const landing = moved ? moved(item, columnId) : item;
    const at = rest.findIndex((x) => compare(landing, x, columnId) < 0);
    return at < 0 ? rest.length : at;
  }

  const onCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, item: T, column: KanbanColumn) => {
    // Keys inside the card's own links and buttons behave as usual.
    if (e.target !== e.currentTarget) return;
    const itemId = getId(item);
    const d = dragRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (d?.mode === "keyboard" && d.id === itemId) {
        finish(true);
      } else if (!d) {
        const r = e.currentTarget.getBoundingClientRect();
        const next: Drag = { id: itemId, from: column.id, width: r.width, height: r.height, offsetX: 0, offsetY: 0, mode: "keyboard" };
        dragRef.current = next;
        overRef.current = column.id;
        setDrag(next);
        setOver(column.id);
        setAnnouncement(`Picked up ${labelOf(item)} in ${column.label}. Use the left and right arrow keys to move it, Space to drop it, Escape to cancel.`);
      }
      return;
    }
    if (d?.mode !== "keyboard" || d.id !== itemId) return;
    if (e.key === "Escape") {
      e.preventDefault();
      overRef.current = null;
      finish(false);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const order = shown.map((c) => c.id);
      const at = order.indexOf(overRef.current ?? d.from);
      const next = order[Math.max(0, Math.min(order.length - 1, at + (e.key === "ArrowLeft" ? -1 : 1)))];
      if (next && next !== overRef.current) {
        overRef.current = next;
        setOver(next);
        setAnnouncement(`Over ${columnName(next)}.`);
        trackRef.current
          ?.querySelector<HTMLElement>(`[data-kanban-drop="${CSS.escape(next)}"]`)
          ?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      }
    }
  };

  const card = (item: T, column: KanbanColumn, first: boolean) => {
    const itemId = getId(item);
    const carried = drag?.id === itemId;
    const lifted = carried && drag?.mode === "keyboard";
    return (
      <motion.div
        key={itemId}
        layout="position"
        transition={GLIDE}
        initial={landed === itemId ? { opacity: 0.5, scale: 0.97 } : false}
        animate={{ opacity: 1, scale: 1 }}
        // Collapsed rather than removed, so a keyboard carry keeps its focus.
        className={cn("shrink-0", carried && away && cn("h-0 overflow-hidden", first ? PULL_DOWN : PULL_UP))}
      >
        <div
          data-kanban-item={itemId}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable card"
          aria-label={`${labelOf(item)}. Press Space to pick it up and move it to another column.`}
          onPointerDown={(e) => {
            if (e.button !== 0 || dragRef.current) return;
            if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[role=menuitem],[data-no-drag]")) return;
            const p: Pending = {
              id: itemId,
              from: column.id,
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              rect: e.currentTarget.getBoundingClientRect(),
              touch: e.pointerType === "touch",
            };
            if (p.touch) {
              p.timer = window.setTimeout(() => {
                if (pendingRef.current !== p) return;
                pendingRef.current = null;
                const d: Drag = {
                  id: p.id,
                  from: p.from,
                  width: p.rect.width,
                  height: p.rect.height,
                  offsetX: p.startX - p.rect.left,
                  offsetY: p.startY - p.rect.top,
                  mode: "pointer",
                };
                x.set(p.startX - d.offsetX);
                y.set(p.startY - d.offsetY);
                dragRef.current = d;
                overRef.current = p.from;
                setDrag(d);
                setOver(p.from);
              }, HOLD_MS);
            }
            pendingRef.current = p;
          }}
          onKeyDown={(e) => onCardKeyDown(e, item, column)}
          className={cn(
            "rounded-(--radius-300) outline-none select-none [-webkit-touch-callout:none]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-focus)",
            lifted && "outline-2 outline-offset-2 outline-(--border-focus)",
            carried &&
              !lifted &&
              "border border-dashed border-(--border-tertiary) bg-(--bg-fill-transparent) [&>*]:invisible",
          )}
        >
          <KanbanCardContext.Provider value={{ column, columns }}>
            {renderCard(item, { column, columns })}
          </KanbanCardContext.Provider>
        </div>
      </motion.div>
    );
  };

  const carriedItem = drag?.mode === "pointer" ? items.find((x) => getId(x) === drag.id) : undefined;
  const carriedColumn = drag ? columns.find((c) => c.id === drag.from) : undefined;

  return (
    <>
      <KanbanFrame trackRef={trackRef}>
        {shown.map((c) => {
          const list = byColumn.get(c.id) ?? [];
          const slotAt = slotIndex(c.id, list);
          const nodes: React.ReactNode[] = [];
          let k = 0;
          list.forEach((item, i) => {
            if (getId(item) !== drag?.id) {
              if (k === slotAt) nodes.push(<Slot key="slot" height={drag?.height ?? 96} />);
              k += 1;
            }
            nodes.push(card(item, c, i === 0));
          });
          if (slotAt >= k) nodes.push(<Slot key="slot" height={drag?.height ?? 96} />);
          // While a card is carried, counts show where it would land, not where it came from.
          const count = list.length - (away && drag?.from === c.id ? 1 : 0) + (isTarget(c.id) ? 1 : 0);
          return (
            <KanbanLane
              key={c.id}
              data-kanban-drop={c.id}
              column={c}
              columns={columns}
              count={count}
              summary={c.summary}
              reserveSummary={anySummary}
              target={isTarget(c.id)}
              footer={
                onAdd ? (
                  <Button variant="tertiary" fullWidth textAlign="left" icon="PlusMinor" onClick={() => onAdd(c.id)}>
                    {addLabel ?? "Add"}
                  </Button>
                ) : undefined
              }
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <RowActionButton aria-label={`${c.label} column actions`} className="size-6">
                      <Ellipsis />
                    </RowActionButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onAdd ? <DropdownMenuItem onClick={() => onAdd(c.id)}>{addLabel ?? "Add"}</DropdownMenuItem> : null}
                    <DropdownMenuItem onClick={() => updateHidden([...hidden, c.id])}>
                      <EyeOff className="mr-2 size-3.5" />
                      Hide column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              {nodes.length === 0 ? <KanbanEmpty>{`No ${noun.many} here yet`}</KanbanEmpty> : nodes}
            </KanbanLane>
          );
        })}
        {shown.length === 0 ? (
          <div className="flex min-w-[min(85vw,20rem)] flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <h2 className="body-md-semibold">Every column is hidden</h2>
            <p className="body-sm max-w-[22em] text-(--text-secondary)">{`Show a column from the rail to see its ${noun.many}.`}</p>
          </div>
        ) : null}
        {hiddenColumns.length > 0 ? (
          <aside
            aria-label="Hidden columns"
            className="flex w-46 shrink-0 flex-col gap-4 rounded-(--radius-300) bg-(--kanban-lane-rest) p-3"
          >
            <header className="flex min-h-6 items-center justify-between gap-2">
              <h2 className="body-md-semibold truncate">Hidden columns</h2>
              <span className="-mr-1 flex shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <RowActionButton aria-label="Hidden columns actions" className="size-6">
                      <Ellipsis />
                    </RowActionButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateHidden([])}>Show all columns</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </header>
            <div className="-mx-1 flex flex-col gap-1">
              {hiddenColumns.map((c) => (
                <div
                  key={c.id}
                  data-kanban-drop={c.id}
                  data-kanban-rail=""
                  className={cn(
                    // `\_` keeps the underscores in `.p-btn__label`; Tailwind reads a bare `_` as a space.
                    String.raw`rounded-(--radius-200) transition-colors duration-150 [&_.p-btn\_\_label]:flex [&_.p-btn\_\_label]:flex-1 [&_.p-btn\_\_label]:justify-between [&_.p-btn\_\_label]:gap-2`,
                    isTarget(c.id) && "bg-(--bg-surface-info) ring-1 ring-(--border-info)",
                  )}
                >
                  <Button
                    variant="tertiary"
                    fullWidth
                    textAlign="left"
                    title={`Show ${c.label}`}
                    icon={<StageIcon column={c} columns={columns} />}
                    onClick={() => updateHidden(hidden.filter((x) => x !== c.id))}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="tabular-nums text-(--text-secondary)">{(byColumn.get(c.id) ?? []).length}</span>
                  </Button>
                </div>
              ))}
            </div>
            <p className="body-sm mt-auto text-(--text-secondary)">
              {`Drop a ${noun.one} on a column to move it there, or select one to bring it back to the board.`}
            </p>
          </aside>
        ) : null}
      </KanbanFrame>

      {/* The card riding the pointer, lifted and tilted. In a portal, so no
          transformed ancestor can pin it to the board. */}
      {onClient
        ? createPortal(
            <AnimatePresence>
              {drag?.mode === "pointer" && carriedItem && carriedColumn ? (
                <motion.div
                  key={drag.id}
                  style={{ x, y, width: drag.width }}
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: reduceMotion ? 1 : 1.03, rotate: reduceMotion ? 0 : 1.6 }}
                  exit={{ opacity: 0 }}
                  transition={LIFT}
                  className="pointer-events-none fixed top-0 left-0 z-[500] origin-top-left [&_[data-kanban-card]]:shadow-(--kanban-card-shadow-lift)"
                >
                  <KanbanCardContext.Provider value={{ column: carriedColumn, columns }}>
                    {renderCard(carriedItem, { column: carriedColumn, columns })}
                  </KanbanCardContext.Provider>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <p className="p-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
