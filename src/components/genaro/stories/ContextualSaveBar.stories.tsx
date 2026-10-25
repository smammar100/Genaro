import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Card, ContextualSaveBar, TextField, TopBar } from "@/components/genaro";
import guidelines from "../docs/ContextualSaveBar.md?raw";

/**
 * The bar that says a form has unsaved changes, with Discard and Save. Show it
 * only while there are changes, through `Frame` (or `TopBar`)
 * `contextualSaveBar`; for a short form in a dialog, use the `Modal`'s actions.
 */
const meta = {
  title: "Components/App chrome and navigation/ContextualSaveBar",
  component: ContextualSaveBar,
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  args: {
    message: "Unsaved vehicle",
    saveAction: { content: "Save vehicle", onAction: fn() },
    discardAction: { content: "Discard", onAction: fn() },
  },
} satisfies Meta<typeof ContextualSaveBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A form with changes that aren't saved yet. Name what's unsaved in the
 * message ("Unsaved vehicle"); it defaults to "Unsaved changes".
 * @summary unsaved changes, with Discard and Save
 */
export const Default: Story = {};

/**
 * Save stays disabled until the form is valid, such as before a registration
 * is entered.
 * @summary Save waits for a valid form
 */
export const SaveDisabled: Story = {
  args: { saveAction: { content: "Save vehicle", disabled: true, onAction: fn() } },
};

/**
 * While the save runs, Save is disabled and marked busy, so it can't be sent
 * twice.
 * @summary a save in progress
 */
export const Saving: Story = {
  args: { saveAction: { content: "Save vehicle", loading: true, onAction: fn() } },
};

/**
 * Where it usually shows: in the top bar, in place of search. Inside a
 * `Frame`, pass the same props to the Frame's `contextualSaveBar`.
 * @summary in the top bar, in place of search
 */
export const InTheTopBar: Story = {
  render: (args) => <TopBar logo="Car Capital" storeName="Amira Hussain" contextualSaveBar={args} />,
};

/**
 * With `formId`, Save submits that `<form>`, wherever it is on the page, so a
 * form posting to a Server Action needs no submit code.
 * @summary Save submits a form by id
 */
export const SubmitsAForm: Story = {
  args: { formId: "vehicle-form" },
  render: (args) => (
    <>
      <ContextualSaveBar {...args} />
      <form
        id="vehicle-form"
        onSubmit={(event) => event.preventDefault()}
        style={{ padding: "var(--space-400)" }}
      >
        <Card>
          <TextField label="Registration" name="registration" defaultValue="OY70 TZG" />
        </Card>
      </form>
    </>
  ),
};
