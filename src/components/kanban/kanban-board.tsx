"use client";

import * as React from "react";
import { motion, type Transition } from "framer-motion";
import { Ellipsis, EyeOff } from "lucide-react";
import { Button } from "@/components/polaris";
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
  /** Adds a card from a column's "+". Leave out on boards that don't create cards. */
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

/** Space between cards, and what a collapsed card pulls back so it leaves no gap. */
const CARD_GAP = "gap-3";
const PULL_UP = "-mt-3";
const PULL_DOWN = "-mb-3";

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
 * The board's frame: one surface the columns sit on, divided by hairlines,
 * running to the foot of the window so each column scrolls on its own. It
 * scrolls sideways, a column at a time on a phone.
 */
export function KanbanFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const height = useFillHeight(ref, 416);
  return (
    <motion.div
      ref={ref}
      layoutScroll
      style={height ? { height } : undefined}
      className={cn(
        "flex min-h-[26rem] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-(--radius-300) border border-(--border-secondary) bg-(--kanban-board) sm:snap-none",
        className,
      )}
    >
      {children}
    </motion.div>
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
  /** The header's buttons, right: the "+" and the column's "…" menu. */
  actions?: React.ReactNode;
  /** A dragged card is over this column. */
  target?: boolean;
  children: React.ReactNode;
};

/**
 * One column: a status badge, the name and its count in a header that stays
 * put while the cards scroll under it (they fade out beneath it), then the
 * cards. Also used by boards that don't drag (prep), so every board shares
 * the anatomy.
 */
export function KanbanLane({
  column,
  columns,
  count,
  summary,
  reserveSummary = false,
  actions,
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
      // The header's fade is painted in the lane's own colour, so a lane
      // tinted as a drop target fades into the tint rather than a white band.
      style={{ ...style, ["--kanban-lane" as string]: target ? "var(--kanban-lane-target)" : "var(--kanban-board)" }}
      className={cn(
        "flex h-full w-[85vw] max-w-[340px] shrink-0 snap-start flex-col overflow-y-auto overscroll-y-contain border-r border-(--border-secondary) bg-(--kanban-lane) last-of-type:border-r-0 transition-colors duration-150 sm:w-[300px] lg:w-auto lg:min-w-[272px] lg:max-w-none lg:flex-1",
        className,
      )}
    >
      <header className="sticky top-0 z-20 flex min-w-0 shrink-0 items-start gap-2 bg-[linear-gradient(to_bottom,var(--kanban-lane)_calc(100%-16px),transparent)] px-4 pb-4 pt-3.5">
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
            <span className="body-md shrink-0 tabular-nums text-(--text-secondary)">{count}</span>
          </div>
          {summary || reserveSummary ? (
            <span className="body-xs truncate tabular-nums text-(--text-secondary)">{summary || "\u00a0"}</span>
          ) : null}
        </div>
        {actions ? <span className="-mr-1.5 flex h-6 shrink-0 items-center gap-0.5">{actions}</span> : null}
      </header>
      {/* Never squeezed: the app zeroes every flex item's min-height, so
          without shrink-0 the list (and the cards in it) would crush to fit
          the column instead of scrolling. */}
      <div className={cn("flex shrink-0 flex-col px-4 [&>*]:shrink-0", CARD_GAP)}>{children}</div>
      {/* Room under the last card, and somewhere to drop at the foot of a full column. */}
      <div aria-hidden className="min-h-6 flex-1" />
    </motion.section>
  );
}

/** A column with no cards: a dashed well that says so, with the add button when the board has one. */
export function KanbanEmpty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[8.125rem] flex-col items-center justify-center gap-2 rounded-(--radius-400) border border-dashed border-(--border) bg-(--bg-surface-secondary) px-4 py-6 text-center">
      <p className="body-sm text-(--text-secondary)">{children}</p>
      {action}
    </div>
  );
}

/** The board while its data loads: the frame and lanes, with pulsing card shapes. */
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <KanbanFrame>
      {Array.from({ length: columns }, (_, c) => (
        <div
          key={c}
          aria-busy
          className="flex h-full w-[85vw] max-w-[340px] shrink-0 flex-col gap-3 border-r border-(--border-secondary) px-4 pt-3.5 last:border-r-0 sm:w-[300px] lg:w-auto lg:min-w-[272px] lg:max-w-none lg:flex-1"
        >
          <div className="mb-1 flex h-6 items-center gap-2">
            <Skeleton className="size-3.5 rounded-(--radius-100)" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: 3 - (c % 2) }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-(--radius-400)" />
          ))}
        </div>
      ))}
    </KanbanFrame>
  );
}

/** Where the dragged card will land: a dashed well of its height. */
function Slot({ height }: { height: number }) {
  return (
    <motion.div
      layout="position"
      transition={GLIDE}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-hidden
      className="shrink-0 rounded-(--radius-400) border border-dashed border-(--border) bg-(--bg-surface-secondary)"
      style={{ height }}
    />
  );
}

/**
 * The picture that follows the pointer: the card, lifted off the board, tilted
 * a few degrees with a focus-tinted ring. Built off-screen for the browser to
 * snapshot, then thrown away.
 */
function liftedDragImage(e: React.DragEvent<HTMLElement>) {
  const source = e.currentTarget;
  const card = source.querySelector<HTMLElement>("[data-kanban-card]");
  if (!card || typeof e.dataTransfer.setDragImage !== "function") return;
  const rect = card.getBoundingClientRect();
  // Room round the card for the tilt and the ring, so neither is clipped.
  const pad = 24;
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText = `position:fixed;top:0;left:-10000px;padding:${pad}px;pointer-events:none;`;
  const clone = card.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.rotate = "-3deg";
  clone.style.boxShadow = "var(--kanban-card-shadow-lift)";
  ghost.appendChild(clone);
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, e.clientX - rect.left + pad, e.clientY - rect.top + pad);
  window.setTimeout(() => ghost.remove(), 0);
}

/**
 * The app's Kanban board, after the reference board: open lanes on one
 * surface divided by hairlines, a status badge and count over each, soft
 * white cards. Drag a card between columns: it lifts off the board, its old
 * spot becomes a dashed well, and the well moves to where the card will land
 * as the other cards glide aside. Any column can be hidden to a rail from its
 * "…" menu (Lost starts there); the choice persists. The board fills the
 * window's height and scrolls sideways, a column at a time on a phone. Pages
 * own the data and the saving; the board owns the layout.
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
  onAdd,
  addLabel,
  noun,
  defaultHidden = [],
}: KanbanBoardProps<T>) {
  const [hidden, setHidden] = React.useState<string[]>(defaultHidden);
  const [drag, setDrag] = React.useState<{ id: string; from: string; height: number } | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  // The card just dropped, which settles into its new spot rather than popping in.
  const [landed, setLanded] = React.useState<string | null>(null);

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

  const dropZone = (columnId: string) => ({
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== columnId) setOver(columnId);
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setOver((o) => (o === columnId ? null : o));
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (drag && drag.from !== columnId) {
        onMove(drag.id, columnId);
        setLanded(drag.id);
      }
      setDrag(null);
      setOver(null);
    },
  });

  const card = (item: T, column: KanbanColumn, first: boolean) => {
    const itemId = getId(item);
    const carried = drag?.id === itemId;
    return (
      <motion.div
        key={itemId}
        layout="position"
        transition={GLIDE}
        initial={landed === itemId ? { opacity: 0.5, scale: 0.97 } : false}
        animate={{ opacity: 1, scale: 1 }}
        // Collapsed rather than removed: the browser ends a drag whose source leaves the page.
        className={cn("shrink-0", carried && away && cn("h-0 overflow-hidden", first ? PULL_DOWN : PULL_UP))}
      >
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", itemId);
            liftedDragImage(e);
            const h = e.currentTarget.getBoundingClientRect().height;
            // Next frame: restyling the source inside dragstart cancels the drag in Chrome.
            window.requestAnimationFrame(() => setDrag({ id: itemId, from: column.id, height: h }));
          }}
          onDragEnd={() => {
            setDrag(null);
            setOver(null);
          }}
          className={cn(
            "rounded-(--radius-400)",
            carried && "border border-dashed border-(--border) bg-(--bg-surface-secondary) [&>*]:invisible",
          )}
        >
          <KanbanCardContext.Provider value={{ column, columns }}>
            {renderCard(item, { column, columns })}
          </KanbanCardContext.Provider>
        </div>
      </motion.div>
    );
  };

  const addButton = (c: KanbanColumn) =>
    onAdd ? (
      <Button variant="tertiary" icon="PlusMinor" onClick={() => onAdd(c.id)}>
        {addLabel ?? "Add"}
      </Button>
    ) : undefined;

  return (
    <KanbanFrame>
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
        return (
          <KanbanLane
            key={c.id}
            column={c}
            columns={columns}
            count={list.length}
            summary={c.summary}
            reserveSummary={anySummary}
            target={isTarget(c.id)}
            {...dropZone(c.id)}
            actions={
              <>
                {onAdd ? (
                  <Button variant="tertiary" size="micro" icon="PlusMinor" accessibilityLabel={`${addLabel ?? "Add"} to ${c.label}`} onClick={() => onAdd(c.id)} />
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <RowActionButton aria-label={`${c.label} column actions`} className="size-6">
                      <Ellipsis />
                    </RowActionButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onAdd ? (
                      <DropdownMenuItem onClick={() => onAdd(c.id)}>{addLabel ?? "Add"}</DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => updateHidden([...hidden, c.id])}>
                      <EyeOff className="mr-2 size-3.5" />
                      Hide column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          >
            {nodes.length === 0 ? <KanbanEmpty action={addButton(c)}>{`No ${noun.many} here yet`}</KanbanEmpty> : nodes}
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
        <aside aria-label="Hidden columns" className="flex w-46 shrink-0 flex-col gap-4 border-l border-(--border-secondary) p-4">
          <header className="flex min-h-6 items-center justify-between gap-2">
            <h2 className="body-md-semibold truncate">Hidden columns</h2>
            <span className="-mr-1.5 flex shrink-0">
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
          <div aria-hidden className="h-px bg-(--border-secondary)" />
          <div className="-mx-2 flex flex-col gap-1">
            {hiddenColumns.map((c) => (
              <div
                key={c.id}
                {...dropZone(c.id)}
                className={cn(
                  "rounded-(--radius-200) transition-colors duration-150 [&_.p-btn__label]:flex [&_.p-btn__label]:flex-1 [&_.p-btn__label]:justify-between [&_.p-btn__label]:gap-2",
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
          <p className="body-xs mt-auto text-(--text-secondary)">
            {`Drop a ${noun.one} on a column to move it there, or select one to bring it back to the board.`}
          </p>
        </aside>
      ) : null}
    </KanbanFrame>
  );
}
