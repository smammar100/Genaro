import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { LayoutGrid, Rows3 } from "lucide-react";
import { Button, ButtonGroup, iconNames, type ButtonProps } from "@/components/genaro";
import guidelines from "../docs/Button.md?raw";

/**
 * Buttons trigger an action or navigate. A view has at most one primary
 * button, for its main action; everything else is the default secondary
 * button. Labels are a verb and a noun in sentence case ("Add vehicle").
 */
const meta = {
  title: "Components/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: { children: "Add vehicle", onClick: fn() },
  argTypes: {
    icon: { control: "select", options: [undefined, ...iconNames] },
    children: { control: "text" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default button, for any action in a view that isn't its main one.
 * @summary any action that isn't the view's main one
 */
export const Secondary: Story = {};

const VARIANTS: { variant: NonNullable<ButtonProps["variant"]>; tones: ButtonProps["tone"][] }[] = [
  { variant: "primary", tones: [undefined, "critical"] },
  { variant: "secondary", tones: [undefined, "critical"] },
  { variant: "tertiary", tones: [undefined, "critical"] },
  { variant: "plain", tones: [undefined] },
];

const cell = { padding: "var(--space-200) var(--space-300)", textAlign: "left", verticalAlign: "middle" } as const;

/**
 * Every button at a glance: each variant and tone in each state, then the
 * three sizes. For browsing; the stories after this one show each type on
 * its own, with when to use it.
 * @summary every variant, tone, state and size side by side
 */
export const AllButtons: Story = {
  tags: ["!manifest"],
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-600)" }}>
      <table className="body-md" style={{ borderCollapse: "collapse" }}>
        <thead className="body-sm" style={{ color: "var(--text-secondary)" }}>
          <tr>
            {["Variant", "Default", "Disabled", "Loading", "With icon", "Icon only", "Disclosure", "Pressed"].map((h) => (
              <th key={h} style={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {VARIANTS.flatMap(({ variant, tones }) =>
            tones.map((tone) => {
              const p: ButtonProps = { variant, tone };
              const pressable = !tone && (variant === "secondary" || variant === "tertiary");
              return (
                <tr key={`${variant}-${tone ?? "default"}`} style={{ borderTop: "var(--border-width-025) solid var(--border-secondary)" }}>
                  <td style={cell} className="body-sm">
                    <code>{variant}</code>
                    {tone ? (
                      <>
                        {" "}
                        <code>{tone}</code>
                      </>
                    ) : null}
                  </td>
                  <td style={cell}>
                    <Button {...p}>{tone === "critical" ? "Delete lead" : "Add vehicle"}</Button>
                  </td>
                  <td style={cell}>
                    <Button {...p} disabled>
                      Save vehicle
                    </Button>
                  </td>
                  <td style={cell}>
                    <Button {...p} loading>
                      Save vehicle
                    </Button>
                  </td>
                  <td style={cell}>
                    <Button {...p} icon={tone === "critical" ? "DeleteMinor" : "PlusMinor"}>
                      {tone === "critical" ? "Delete" : "Add"}
                    </Button>
                  </td>
                  <td style={cell}>
                    <Button {...p} icon={tone === "critical" ? "DeleteMinor" : "EditMinor"} accessibilityLabel={tone === "critical" ? "Delete" : "Edit"} />
                  </td>
                  <td style={cell}>
                    <Button {...p} disclosure>
                      More actions
                    </Button>
                  </td>
                  <td style={cell}>
                    {pressable ? (
                      <Button {...p} pressed icon={<LayoutGrid />}>
                        Cards
                      </Button>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>

      <table className="body-md" style={{ borderCollapse: "collapse" }}>
        <thead className="body-sm" style={{ color: "var(--text-secondary)" }}>
          <tr>
            {["Size", "Primary", "Secondary", "Tertiary", "Icon only"].map((h) => (
              <th key={h} style={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["micro", "medium", "large"] as const).map((size) => (
            <tr key={size} style={{ borderTop: "var(--border-width-025) solid var(--border-secondary)" }}>
              <td style={cell} className="body-sm">
                <code>{size}</code>
              </td>
              <td style={cell}>
                <Button size={size} variant="primary">
                  Save vehicle
                </Button>
              </td>
              <td style={cell}>
                <Button size={size}>Add vehicle</Button>
              </td>
              <td style={cell}>
                <Button size={size} variant="tertiary">
                  View history
                </Button>
              </td>
              <td style={cell}>
                <Button size={size} icon="HorizontalDotsMinor" accessibilityLabel="More actions" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

/**
 * The view's main action. Use one primary button per view, so it's clear
 * what to do next; every other action stays secondary.
 * @summary the one main action in a view
 */
export const Primary: Story = {
  args: { variant: "primary", children: "Save vehicle" },
};

/**
 * Destructive actions that can't be undone, such as deleting a lead. Ask for
 * confirmation in a Modal before the action runs.
 * @summary destructive actions, confirmed in a Modal
 */
export const Critical: Story = {
  args: { variant: "primary", tone: "critical", children: "Delete lead" },
};

/**
 * A destructive action that isn't the view's main one, such as taking a car
 * off the website from its page. Still confirm it before it runs.
 * @summary destructive actions that aren't the main one
 */
export const SecondaryCritical: Story = {
  args: { tone: "critical", children: "Remove from website" },
};

/**
 * A low-emphasis destructive action inside a card, such as removing one
 * photo from a gallery.
 * @summary low-emphasis destructive actions in cards
 */
export const TertiaryCritical: Story = {
  args: { variant: "tertiary", tone: "critical", children: "Remove photo" },
};

/**
 * Low-emphasis actions inside a card or a banner, where a bordered button
 * would compete with the content.
 * @summary low-emphasis actions inside cards and banners
 */
export const Tertiary: Story = {
  args: { variant: "tertiary", children: "View history" },
};

/**
 * Inline, link-like actions in a sentence or a row of text.
 * @summary inline, link-like actions in text
 */
export const Plain: Story = {
  args: { variant: "plain", children: "View vehicle" },
};

/**
 * An icon before the label when it helps recognition, such as a plus for
 * "Add".
 * @summary a leading icon that helps recognition
 */
export const WithIcon: Story = {
  args: { variant: "primary", icon: "PlusMinor", children: "Add vehicle" },
};

/**
 * Icon-only buttons save room in dense rows. They need an
 * `accessibilityLabel`, which screen readers announce instead of a label.
 * @summary compact rows; always give an accessibilityLabel
 */
export const IconOnly: Story = {
  args: { icon: "EditMinor", children: undefined, accessibilityLabel: "Edit vehicle" },
};

/**
 * Row actions in tables and lists: a micro icon-only button keeps the row
 * short. Name the row in the label so screen readers know which one it is.
 * @summary row actions in tables; label names the row
 */
export const IconOnlyMicro: Story = {
  args: {
    variant: "tertiary",
    size: "micro",
    icon: "HorizontalDotsMinor",
    children: undefined,
    accessibilityLabel: "More actions for OY70 TZG",
  },
};

/**
 * A trailing chevron says the button opens a menu or a panel rather than
 * acting straight away.
 * @summary buttons that open a menu or panel
 */
export const Disclosure: Story = {
  args: { disclosure: true, children: "More actions" },
};

/**
 * A full-width trigger with its label on the left, such as a picker in a
 * side panel that opens a list of options.
 * @summary full-width pickers with a left-aligned label
 */
export const AlignLeft: Story = {
  args: { fullWidth: true, textAlign: "left", disclosure: true, children: "Forecourt" },
};

/**
 * While an action runs, the button shows a spinner and ignores clicks, so it
 * can't be sent twice.
 * @summary an action in progress; blocks double submits
 */
export const Loading: Story = {
  args: { variant: "primary", loading: true, children: "Save vehicle" },
};

/**
 * An action that isn't available yet, such as saving before a required field
 * is filled.
 * @summary actions that aren't available yet
 */
export const Disabled: Story = {
  args: { variant: "primary", disabled: true, children: "Save vehicle" },
};

/**
 * With a `url` the button is a link and navigates. Internal URLs go through
 * the router link from GenaroProvider.
 * @summary navigation that looks like a button
 */
export const AsLink: Story = {
  args: { url: "/vehicles", children: "View all vehicles" },
};

/**
 * The button that sends a form. `submit` makes it `type="submit"`, so Enter
 * in any field sends the form too.
 * @summary sends the form it sits in
 */
export const Submit: Story = {
  args: { submit: true, variant: "primary", children: "Save lead" },
  render: (args) => (
    <form onSubmit={(event) => event.preventDefault()}>
      <Button {...args} />
    </form>
  ),
};

/**
 * A toggle that stays pressed while its option is on, such as a view switch.
 * @summary a toggle that shows whether it's on
 */
export const Pressed: Story = {
  args: { pressed: true, icon: <LayoutGrid />, children: "Cards" },
};

/**
 * A quieter toggle for toolbars, where bordered buttons would be too heavy.
 * @summary low-emphasis toggles in toolbars
 */
export const TertiaryPressed: Story = {
  args: { variant: "tertiary", pressed: true, icon: <Rows3 />, children: "Table" },
};

/**
 * Three heights: micro (24px) for dense rows, medium (28px) by default, large
 * (32px) for empty states and onboarding.
 * @summary micro 24px, medium 28px, large 32px
 */
export const Sizes: Story = {
  render: (args) => (
    <ButtonGroup>
      <Button {...args} size="micro">
        Micro
      </Button>
      <Button {...args} size="medium">
        Medium
      </Button>
      <Button {...args} size="large">
        Large
      </Button>
    </ButtonGroup>
  ),
};

/**
 * A button that fills its container, for narrow panels and mobile layouts.
 * @summary fills narrow panels and mobile layouts
 */
export const FullWidth: Story = {
  args: { fullWidth: true, variant: "primary", children: "Book appointment" },
};
