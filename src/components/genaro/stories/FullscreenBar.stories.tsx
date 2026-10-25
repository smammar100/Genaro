import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button, FullscreenBar } from "@/components/genaro";
import guidelines from "../docs/FullscreenBar.md?raw";

/** The editor's actions: one secondary, then the one primary. */
const actions = (publishing = false) => (
  <>
    <Button onClick={fn()}>Preview advert</Button>
    <Button variant="primary" loading={publishing} onClick={fn()}>
      Publish advert
    </Button>
  </>
);

/**
 * The header for a full-screen editor that hides the app's navigation: an
 * Exit button, what's being edited, and the editor's actions. Render it on a
 * route outside the `Frame`; everywhere else, the `TopBar` is the header.
 */
const meta = {
  title: "Components/App chrome and navigation/FullscreenBar",
  component: FullscreenBar,
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  args: {
    title: "Advert for OY70 TZG",
    onAction: fn(),
    children: actions(),
  },
  argTypes: {
    title: { control: "text" },
    children: { control: false },
  },
} satisfies Meta<typeof FullscreenBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An editor's header: Exit on the left, what's being edited, then one
 * secondary and one primary action. Navigate away from `onAction`.
 * @summary an editor's header: Exit, title, actions
 */
export const Default: Story = {};

/**
 * A badge after the title gives the state of what's being edited, such as a
 * draft that isn't live yet.
 * @summary the state of what's being edited ("Draft")
 */
export const WithBadge: Story = {
  args: { badge: { tone: "info", content: "Draft" } },
};

/**
 * While the main action runs, its button shows a spinner and can't be pressed
 * twice.
 * @summary the main action in progress
 */
export const Publishing: Story = {
  args: {
    badge: { tone: "info", content: "Draft" },
    children: actions(true),
  },
};

/**
 * A view with nothing to save, such as a photo viewer, needs only Exit and
 * the title.
 * @summary Exit and a title, nothing to save
 */
export const ExitOnly: Story = {
  args: { title: "Photos of OY70 TZG", children: undefined },
};
