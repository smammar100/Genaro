import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StagePath, type StagePathStage } from "./stage-path";

const stages: StagePathStage[] = [
  { slug: "new_lead", label: "New lead", behaviour: "open" },
  { slug: "contacted", label: "Contacted", behaviour: "open" },
  { slug: "qualified", label: "Qualified / viewing", behaviour: "open" },
  { slug: "deposit_taken", label: "Deposit taken", behaviour: "reserved" },
  { slug: "collection", label: "Collection / delivery", behaviour: "open" },
  { slug: "completed_sale", label: "Completed sale", behaviour: "won" },
  { slug: "lost", label: "Lost", behaviour: "lost" },
];

/**
 * A deal's stages as one bar across the top of the deal page: passed stages
 * filled green, the current one blue with its days in stage, the rest grey.
 * The pipeline's own stage names, so a renamed stage reads the same here.
 */
const meta = {
  title: "App components/Sales/StagePath",
  component: StagePath,
  tags: ["autodocs"],
  args: { stages, current: "new_lead", daysInStage: 3 },
  argTypes: { stages: { control: false } },
} satisfies Meta<typeof StagePath>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A lead taken three days ago and not yet contacted.
 * @summary a new lead on the deal page
 */
export const Default: Story = {};

/**
 * Two stages passed: the deposit is in and the car is reserved.
 * @summary partway through, with the deposit taken
 */
export const DepositTaken: Story = {
  args: { current: "deposit_taken", daysInStage: 1 },
};

/**
 * A lost deal greys the whole bar; the page's badge says it was lost.
 * @summary a deal that fell through
 */
export const Lost: Story = {
  args: { current: "lost", daysInStage: undefined },
};
