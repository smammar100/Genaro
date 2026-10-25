import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ListChecks } from "lucide-react";
import { Link } from "@/components/genaro";
import { KanbanEmpty, KanbanFrame, KanbanLane } from "./kanban-board";
import { KanbanCard, KanbanCardContext, KanbanPlate } from "./kanban-card";
import type { KanbanColumn } from "./stage-icon";
import guidelines from "./README.md?raw";

const prep: (KanbanColumn & { hint: string })[] = [
  { id: "unassigned", label: "Unassigned", tone: "neutral", kind: "open", hint: "Waiting for someone to pick it up" },
  { id: "in_progress", label: "In progress", tone: "info", kind: "open", hint: "Prep work under way" },
  { id: "ready", label: "Ready for sales", tone: "success", kind: "done", hint: "All items done" },
];

const cars = [
  { stage: "unassigned", reg: "KM19 XRT", stockId: "L-905", vehicle: "Volkswagen Golf Match", done: 0, total: 5, owner: null },
  { stage: "unassigned", reg: "YA21 KPC", stockId: "L-944", vehicle: "Toyota Yaris Hybrid", done: 0, total: 3, owner: null },
  { stage: "in_progress", reg: "BD18 HVN", stockId: "L-871", vehicle: "BMW 320d M Sport", done: 4, total: 7, owner: "Tom Bradley" },
];

const openCar = fn().mockName("openCar");

function lane(column: (typeof prep)[number]) {
  const here = cars.filter((c) => c.stage === column.id);
  return (
    <KanbanLane key={column.id} column={column} columns={prep} count={here.length} summary={column.hint}>
      {here.length === 0 ? (
        <KanbanEmpty>Nothing here</KanbanEmpty>
      ) : (
        here.map((c) => (
          <KanbanCardContext.Provider key={c.stockId} value={{ column, columns: prep }}>
            <KanbanCard
              onOpen={() => openCar(c.stockId)}
              identity={<KanbanPlate registration={c.reg} href={`/vehicles/${c.stockId}`} title="Open vehicle" />}
              reference={c.stockId}
              title={
                <Link monochrome removeUnderline className="text-left hover:underline" onClick={() => openCar(c.stockId)}>
                  {c.vehicle}
                </Link>
              }
              titleText={c.vehicle}
              facts={[{ icon: ListChecks, tone: c.done ? undefined : "muted", text: `${c.done} of ${c.total} items done` }]}
              person={{ name: c.owner, empty: "Unassigned" }}
            />
          </KanbanCardContext.Provider>
        ))
      )}
    </KanbanLane>
  );
}

/**
 * The surface a Kanban board's lanes sit on: one frame divided by hairlines,
 * running to the foot of the window so each column scrolls on its own, and
 * scrolling sideways when the columns don't fit. `KanbanBoard` and
 * `KanbanSkeleton` draw it for you; use it directly only for a board that
 * doesn't drag, such as prep, where cars move column by themselves.
 */
const meta = {
  title: "App components/Kanban/KanbanFrame",
  component: KanbanFrame,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { children: prep.map(lane) },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof KanbanFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The prep board: three `KanbanLane`s in a frame, each card wrapped in
 * `KanbanCardContext` so it shows its column's glyph. Nothing drags; a car
 * moves when its prep starts or its last item is done.
 * @summary a board that doesn't drag, built from lanes
 */
export const Default: Story = {};

/**
 * When the columns don't fit, the frame scrolls sideways, a column at a time
 * on a phone, and each column still scrolls on its own.
 * @summary scrolls sideways when columns don't fit
 */
export const ScrollsSideways: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "36rem" }}>
        <Story />
      </div>
    ),
  ],
};
