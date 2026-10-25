import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button, Toast } from "@/components/genaro";
import guidelines from "../docs/Toast.md?raw";

/**
 * Toasts confirm that an action worked, in a few words ("Vehicle saved"), then
 * go away. Never put information people need in a toast; use a `Banner` for
 * anything that must stay on screen.
 */
const meta = {
  title: "Components/Feedback and status/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { content: "Vehicle saved", onDismiss: fn() },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Confirms that an action worked, in a noun and a past-tense verb. Rendered in
 * place here; apps pass `floating`.
 * @summary confirms an action worked ("Vehicle saved")
 */
export const Default: Story = {};

/**
 * In apps the toast floats at the bottom centre of the viewport, in a portal
 * on `<body>`. Show one at a time; floating toasts don't stack.
 * @summary how apps show it: bottom centre, in a portal
 */
export const Floating: Story = {
  args: { floating: true },
  parameters: { layout: "fullscreen", docs: { story: { inline: false, height: "200px" } } },
};

/**
 * One follow-up action after the confirmation, such as opening the lead that
 * was just created.
 * @summary one follow-up action ("View lead")
 */
export const WithAction: Story = {
  args: { content: "Lead created", action: { content: "View lead", onAction: fn() } },
};

/**
 * An action that failed, with a way to try again. Leave `duration` off so
 * people have time to act.
 * @summary a failed action, with a retry
 */
export const Error: Story = {
  args: { content: "Couldn't save vehicle", error: true, action: { content: "Retry", onAction: fn() } },
};

/**
 * Plain confirmations can go by themselves: `duration` calls `onDismiss` after
 * that many milliseconds, and you remove the toast there.
 * @summary goes by itself after `duration` ms
 */
export const AutoDismiss: Story = {
  args: { content: "Appointment booked", duration: 4000 },
  render: function AutoDismissStory(args) {
    const [open, setOpen] = React.useState(true);
    if (!open) return <Button onClick={() => setOpen(true)}>Book appointment</Button>;
    return (
      <Toast
        {...args}
        onDismiss={() => {
          args.onDismiss?.();
          setOpen(false);
        }}
      />
    );
  },
};
