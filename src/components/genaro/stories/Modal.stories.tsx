import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button, Modal, TextField, type ModalProps } from "@/components/genaro";
import guidelines from "../docs/Modal.md?raw";

const inspection = [
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
  "Spare key: present",
  "V5C: present",
  "Service book: 6 stamps",
];

/**
 * A dialog for a confirmation or a short, focused task, such as marking an
 * invoice paid or adding a note. It blocks the page until it's done, so keep
 * it short; for longer work, open a page, and for a quick menu, a `Popover`.
 */
const meta = {
  title: "Components/Overlays/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "480px" } },
  },
  args: {
    open: true,
    onClose: fn(),
    title: "Mark invoice INV-1042 as paid?",
    children: (
      <p className="body-md">
        The sale of OY70 TZG to Priya Shah moves to Completed, and the £16,419.00 balance is recorded as
        paid today.
      </p>
    ),
    primaryAction: { content: "Mark as paid", onAction: fn() },
    secondaryActions: [{ content: "Cancel", onAction: fn() }],
  },
  argTypes: { children: { control: false } },
  // Controlled: `open` lives in the args, as it would in state. The button
  // opens the dialog again after it closes; every action closes it.
  render: function ModalStory(args) {
    const [, updateArgs] = useArgs<ModalProps>();
    const close = () => updateArgs({ open: false });
    const { primaryAction } = args;
    return (
      <>
        <Button tone={primaryAction?.destructive ? "critical" : undefined} onClick={() => updateArgs({ open: true })}>
          {primaryAction?.content ?? "Open dialog"}
        </Button>
        <Modal
          {...args}
          onClose={() => {
            args.onClose?.();
            close();
          }}
          primaryAction={
            primaryAction && {
              ...primaryAction,
              onAction: () => {
                primaryAction.onAction?.();
                if (!primaryAction.loading) close();
              },
            }
          }
          secondaryActions={args.secondaryActions?.map((action) => ({
            ...action,
            onAction: () => {
              action.onAction?.();
              close();
            },
          }))}
        />
      </>
    );
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Confirms a step before it happens, saying what will change. The title asks
 * the question; the primary button answers it with a verb and a noun.
 * @summary confirms a step and says what changes
 */
export const Default: Story = {};

/**
 * Confirms an action that can't be undone, such as deleting a lead, with a
 * critical primary button. Small dialogs suit short confirmations.
 * @summary irreversible actions, with a critical button
 */
export const Destructive: Story = {
  args: {
    title: "Delete lead?",
    size: "small",
    children: (
      <p className="body-md">
        Priya Shah’s lead and her 2 appointments will be deleted. This can’t be undone.
      </p>
    ),
    primaryAction: { content: "Delete lead", destructive: true, onAction: fn() },
  },
};

/**
 * A short task in a few fields, such as adding a note to a lead, without
 * leaving the page.
 * @summary a short task in a few fields
 */
export const WithForm: Story = {
  args: {
    title: "Add note",
    children: (
      <TextField label="Note" multiline defaultValue="Wants to collect after 5pm on Friday. Bringing a part exchange." />
    ),
    primaryAction: { content: "Save note", onAction: fn() },
  },
};

/**
 * While the primary action runs, its button shows a spinner and can't be
 * pressed twice. Close the dialog once it finishes.
 * @summary the primary action in progress
 */
export const Loading: Story = {
  args: {
    primaryAction: { content: "Mark as paid", loading: true, onAction: fn() },
  },
};

/**
 * A wide dialog (up to 980px) for content that needs the room, such as an
 * inspection report. The body scrolls inside the dialog when it's long.
 * @summary wide, with a body that scrolls
 */
export const Large: Story = {
  args: {
    title: "Inspection report for OY70 TZG",
    size: "large",
    children: (
      <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-200)" }}>
        {inspection.map((line) => (
          <li key={line} className="body-md">
            {line}
          </li>
        ))}
      </ul>
    ),
    primaryAction: { content: "Approve inspection", onAction: fn() },
    secondaryActions: [{ content: "Close", onAction: fn() }],
  },
};

/**
 * Renders the dialog in place, with no backdrop, portal or focus trap. For
 * docs and previews only; apps always use the portalled dialog.
 * @summary in place, for docs and previews only
 */
export const Inline: Story = {
  args: { inline: true },
  parameters: { docs: { story: { inline: true } } },
};
