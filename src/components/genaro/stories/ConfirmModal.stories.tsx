import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button, ConfirmModal, useConfirm, type ConfirmModalProps } from "@/components/genaro";
import guidelines from "../docs/ConfirmModal.md?raw";

/**
 * A small dialog that asks one yes-or-no question before an action happens,
 * such as deleting a lead. `useConfirm()` wraps it in a promise, like
 * `window.confirm`. When the question needs a field, such as a reason, use a
 * `Modal`; don't confirm routine actions.
 */
const meta = {
  title: "Components/Overlays/ConfirmModal",
  component: ConfirmModal,
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "520px" } },
  },
  args: {
    open: true,
    title: "Registration already on the Master Sheet",
    description: "OY70 TZG already exists (L-927, Ford Fiesta). Add anyway?",
    confirmText: "Add anyway",
    onConfirm: fn(),
    onCancel: fn(),
  },
  argTypes: { description: { control: "text" } },
  // Controlled: `open` lives in the args, as it would in state. The button
  // opens the dialog again; either answer closes it.
  render: function ConfirmModalStory(args) {
    const [, updateArgs] = useArgs<ConfirmModalProps>();
    return (
      <>
        <Button tone={args.destructive ? "critical" : undefined} onClick={() => updateArgs({ open: true })}>
          {args.confirmText ?? "Open dialog"}
        </Button>
        <ConfirmModal
          {...args}
          onConfirm={() => {
            args.onConfirm();
            if (!args.loading) updateArgs({ open: false });
          }}
          onCancel={() => {
            args.onCancel();
            updateArgs({ open: false });
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Checks before an unusual step that's allowed but probably a mistake, such
 * as adding a registration that's already in stock. The primary button
 * answers with what happens next.
 * @summary checks an unusual step before it happens
 */
export const Default: Story = {};

/**
 * Confirms an action that can't be undone, such as deleting a lead, with a
 * critical primary button that names the action.
 * @summary irreversible actions, with a critical button
 */
export const Destructive: Story = {
  args: {
    title: "Delete lead?",
    description: "Priya Shah’s lead and her 2 appointments will be deleted. This can’t be undone.",
    confirmText: "Delete lead",
    destructive: true,
  },
};

/**
 * Keeps the dialog open while the action runs, such as deleting an invoice:
 * the button shows a spinner and the dialog can't be dismissed until it
 * finishes.
 * @summary the action in progress, dialog held open
 */
export const Loading: Story = {
  args: {
    title: "Delete this £1,240.00 invoice?",
    description: "This can’t be undone.",
    confirmText: "Delete invoice",
    destructive: true,
    loading: true,
  },
};

/**
 * `useConfirm()` asks from an event handler and waits for the answer, like
 * `window.confirm`: `await confirm({...})` is `true` on confirm and `false`
 * on cancel, Escape or a backdrop click. Render `confirmDialog` once.
 * @summary await an answer from an event handler
 */
export const WithUseConfirm: Story = {
  args: {
    title: "Delete maintenance job?",
    description: "This permanently deletes the job for OY70 TZG. This can’t be undone.",
    confirmText: "Delete job",
    destructive: true,
  },
  render: function UseConfirmStory(args) {
    const { confirm, confirmDialog } = useConfirm();
    const [answer, setAnswer] = React.useState<string>("No answer yet");
    // A newer question answers an older one `false`; only the latest counts.
    const latest = React.useRef(0);
    const { title, description, confirmText, cancelText, destructive, onConfirm, onCancel } = args;
    const ask = React.useCallback(async () => {
      const asked = ++latest.current;
      const ok = await confirm({ title, description, confirmText, cancelText, destructive });
      if (asked !== latest.current) return;
      if (ok) onConfirm();
      else onCancel();
      setAnswer(ok ? "Job deleted" : "Kept the job");
    }, [confirm, title, description, confirmText, cancelText, destructive, onConfirm, onCancel]);
    // Open on load, as the other overlay stories do.
    React.useEffect(() => {
      void ask();
    }, [ask]);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-300)" }}>
        <Button tone="critical" onClick={() => void ask()}>
          Delete job
        </Button>
        <span className="body-md" style={{ color: "var(--text-secondary)" }}>
          {answer}
        </span>
        {confirmDialog}
      </div>
    );
  },
};
