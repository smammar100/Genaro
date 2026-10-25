import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  Badge,
  Button,
  Card,
  DescriptionList,
  Sheet,
  TextField,
  Tooltip,
  type SheetAction,
  type SheetProps,
} from "@/components/genaro";
import guidelines from "../docs/Sheet.md?raw";

const movements = [
  { move: "Garage → Forecourt", when: "24 Oct 2026, 16:40", note: "Back from Kwik Fit, new front pads" },
  { move: "Yard → Garage", when: "21 Oct 2026, 09:15", note: "With Kwik Fit, expected back 24 Oct" },
  { move: "Forecourt → Yard", when: "12 Oct 2026, 18:02", note: null },
  { move: "Arrival → Forecourt", when: "3 Oct 2026, 11:30", note: "Part exchange from Priya Shah" },
];

const checklist = [
  "Tyres: 6 mm all round",
  "Brake pads: front 7 mm, rear 6 mm",
  "Brake discs: no lip, no scoring",
  "Wipers and washers: working",
  "Lights: all working",
  "Horn: working",
  "Battery: 12.6 V at rest",
  "Oil: clean, at the max mark",
  "Coolant: at level",
  "Air conditioning: blowing cold",
  "Bodywork: light scuff on the rear bumper",
  "Alloys: kerbed front left",
  "Interior: clean, no tears",
  "Seat belts: all latching",
  "Dashboard: no warning lights",
  "Exhaust: no smoke, no blows",
  "Steering: straight, no knocks",
  "Spare key: present",
  "V5C: present",
  "Service book: 6 stamps",
];

const rows = { display: "flex", flexDirection: "column", gap: "var(--space-300)" } as const;

/**
 * A panel that slides in from the right for a record's details or a longer
 * form, such as a deal, a warranty or a vehicle's location history, while
 * the list stays in view. For a confirmation or a one-field task, use a
 * `Modal`; for a menu of actions, an `ActionMenu`.
 */
const meta = {
  title: "Components/Overlays/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "520px" } },
  },
  args: {
    open: true,
    onClose: fn(),
    title: "Location history",
    subtitle: (
      <>
        L-927 · Ford Fiesta <span className="font-code">OY70 TZG</span>
      </>
    ),
    children: (
      <ol style={rows}>
        {movements.map((m) => (
          <li key={m.when} style={{ display: "flex", flexDirection: "column", gap: "var(--space-050)" }}>
            <span className="body-md">{m.move}</span>
            <span className="body-sm" style={{ color: "var(--text-secondary)" }}>
              {m.when}
              {m.note ? ` · ${m.note}` : ""}
            </span>
          </li>
        ))}
      </ol>
    ),
  },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: false },
    titleMetadata: { control: false },
    footer: { control: false },
    children: { control: false },
  },
  // Controlled: `open` lives in the args, as it would in state. The button
  // opens the sheet again after it closes; actions with an `onAction` close it.
  render: function SheetStory(args) {
    const [, updateArgs] = useArgs<SheetProps>();
    const close = () => updateArgs({ open: false });
    const closing = (action: SheetAction): SheetAction =>
      action.onAction
        ? {
            ...action,
            onAction: () => {
              action.onAction?.();
              if (!action.loading) close();
            },
          }
        : action;
    return (
      <>
        <Button onClick={() => updateArgs({ open: true })}>Open sheet</Button>
        <Sheet
          {...args}
          onClose={() => {
            args.onClose();
            close();
          }}
          primaryAction={args.primaryAction && closing(args.primaryAction)}
          secondaryActions={args.secondaryActions?.map(closing)}
        />
      </>
    );
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A record's details beside the list it came from, such as a vehicle's
 * movements. The title names the record; the subtitle says which one it is.
 * @summary a record's details, beside the list
 */
export const Default: Story = {};

/**
 * A longer form than a Modal holds, such as booking an appointment, with
 * the main action at the end of the footer and a way to back out before it.
 * @summary a longer form, with footer actions
 */
export const WithForm: Story = {
  args: {
    title: "New appointment",
    subtitle: "Test drive or collection",
    children: (
      <>
        <TextField label="Vehicle" placeholder="Search registration" defaultValue="OY70 TZG" />
        <TextField label="Customer name" defaultValue="Priya Shah" autoComplete="off" />
        <TextField label="Phone" type="tel" defaultValue="07700 900481" />
        <TextField label="Date and time" defaultValue="Fri 30 Oct 2026, 17:30" />
        <TextField label="Notes" multiline={3} defaultValue="Bringing a part exchange. Wants to collect after 5pm." />
      </>
    ),
    primaryAction: { content: "Book appointment", onAction: fn() },
    secondaryActions: [{ content: "Discard", onAction: fn() }],
  },
};

/**
 * A stack of Cards on the subdued background, with a badge for the record's
 * state, such as a deal and its stage. The primary action links onward.
 * @summary cards on a subdued body, with a status badge
 */
export const WithCards: Story = {
  args: {
    title: "Priya Shah",
    titleMetadata: <Badge tone="success">Deposit taken</Badge>,
    subtitle: "Deal opened 14 Oct 2026",
    background: "subdued",
    children: (
      <>
        <Card title="Vehicle">
          <p className="body-md">
            <span className="font-code">OY70 TZG</span> · 2020 Ford Fiesta 1.0 Titanium
          </p>
        </Card>
        <Card title="Customer">
          <DescriptionList
            gap="tight"
            items={[
              { term: "Phone", description: "07700 900481" },
              { term: "Email", description: "priya.shah@example.com" },
            ]}
          />
        </Card>
        <Card title="Deal">
          <DescriptionList
            gap="tight"
            items={[
              { term: "Agreed price", description: "£16,419.00" },
              { term: "Deposit", description: "£500.00 · 14 Oct 2026" },
              { term: "Collection", description: "30 Oct 2026" },
            ]}
          />
        </Card>
      </>
    ),
    primaryAction: { content: "Generate invoice", icon: "OrdersMinor", url: "/sales/invoice-generation?vehicleId=L-927" },
  },
};

/**
 * A shortcut beside the close button, such as opening the full vehicle
 * record from its to-do list. Keep it to one or two.
 * @summary a shortcut beside the close button
 */
export const WithHeaderActions: Story = {
  args: {
    title: "Ford Fiesta 1.0 Titanium",
    subtitle: (
      <>
        <span className="font-code">OY70 TZG</span> · 4 things to do
      </>
    ),
    headerActions: [{ content: "Open vehicle", url: "/vehicles/L-927" }],
    children: (
      <ul style={rows}>
        {["Valet inside and out", "Fix kerbed front-left alloy", "Replace rear wiper blade", "Take photos for the website"].map(
          (task) => (
            <li key={task} className="body-md">
              {task}
            </li>
          ),
        )}
      </ul>
    ),
  },
};

/**
 * A destructive action sits at the footer's start, in red, away from the
 * primary, such as cancelling a warranty. Confirm it before it runs.
 * @summary a destructive action, apart from the primary
 */
export const DestructiveAction: Story = {
  args: {
    title: "External warranty",
    titleMetadata: <Badge tone="success">Active</Badge>,
    subtitle: "Priya Shah",
    children: (
      <DescriptionList
        items={[
          { term: "Provider", description: "WarrantyWise" },
          { term: "Cover", description: "12 months, 14 Oct 2026 to 13 Oct 2027" },
          { term: "Cost to customer", description: "£399.00" },
        ]}
      />
    ),
    primaryAction: { content: "File claim", onAction: fn() },
    secondaryActions: [{ content: "Cancel warranty", destructive: true, onAction: fn() }],
  },
};

/**
 * A footer of your own when the buttons need more, such as a Tooltip that
 * says why an action is disabled.
 * @summary your own footer, with a reason for a disabled action
 */
export const CustomFooter: Story = {
  args: {
    ...DestructiveAction.args,
    titleMetadata: <Badge tone="critical">Expired</Badge>,
    primaryAction: undefined,
    secondaryActions: undefined,
    footer: (
      <>
        <Tooltip content="Can only file claims on active warranties">
          <Button disabled>File claim</Button>
        </Tooltip>
        <Button variant="tertiary" tone="critical" disabled>
          Cancel warranty
        </Button>
      </>
    ),
  },
};

/**
 * While the primary action saves, its button shows a spinner and can't be
 * pressed twice. Close the sheet once it finishes.
 * @summary the primary action in progress
 */
export const Saving: Story = {
  args: {
    ...WithForm.args,
    primaryAction: { content: "Book appointment", loading: true, onAction: fn() },
  },
};

/**
 * A wide sheet (up to 672px) for content that needs the room, such as a
 * 20-point inspection. The body scrolls between the header and the footer.
 * @summary wide, with a body that scrolls
 */
export const Large: Story = {
  args: {
    title: "20-point inspection",
    subtitle: "Ford Fiesta · L-927 · Inspector: Sam Okafor",
    size: "large",
    children: (
      <ol style={rows}>
        {checklist.map((line) => (
          <li key={line} className="body-md">
            {line}
          </li>
        ))}
      </ol>
    ),
    primaryAction: { content: "Complete inspection", onAction: fn() },
  },
};

/**
 * A narrow sheet (up to 380px) for a short list, such as a vehicle's recent
 * movements, that shouldn't cover much of the page.
 * @summary narrow, for a short list
 */
export const Small: Story = {
  args: { size: "small" },
};
