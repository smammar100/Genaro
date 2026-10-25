import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Moon } from "lucide-react";
import { TopBar, type TopBarProps } from "@/components/genaro";
import guidelines from "../docs/TopBar.md?raw";

/**
 * The dark header across the top of the app: logo, search, notifications and
 * the account menu. Use it as a `Frame`'s `topBar`; full-screen editors use a
 * `FullscreenBar` instead.
 */
const meta = {
  title: "Components/App chrome and navigation/TopBar",
  component: TopBar,
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  args: {
    logo: "Car Capital",
    storeName: "Amira Hussain",
    searchPlaceholder: "Search vehicles and pages",
    showSidekick: false,
    onSearchChange: fn(),
    onNotificationsClick: fn(),
    onUserMenuClick: fn(),
  },
  argTypes: {
    logo: { control: "text" },
    actions: { control: false },
    contextualSaveBar: { control: false },
  },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The app's header as every page shows it: the dealership's name, search and
 * the signed-in user's menu. The app hides the Sidekick button.
 * @summary the app header: logo, search, account menu
 */
export const Default: Story = {};

/**
 * A red dot on the bell says there's something new, such as a lead or a
 * finished inspection. Open the list from `onNotificationsClick`.
 * @summary a red dot for unread notifications
 */
export const UnreadNotifications: Story = {
  args: { unreadNotifications: true },
};

/**
 * Search as the way into the ⌘K command palette, as the app does: open the
 * palette from `onSearchFocus`, and blur the field first so it doesn't reopen.
 * @summary search that opens the command palette
 */
export const OpensCommandPalette: Story = {
  args: { onSearchFocus: fn() },
};

/**
 * Search that filters in place as people type. Pass `searchValue` and
 * `onSearchChange` together; the field has no submit.
 * @summary controlled search, typed in place
 */
export const ControlledSearch: Story = {
  args: { searchValue: "OY70" },
  render: function ControlledSearchStory(args) {
    const [, updateArgs] = useArgs<TopBarProps>();
    return (
      <TopBar
        {...args}
        onSearchChange={(value) => {
          args.onSearchChange?.(value);
          updateArgs({ searchValue: value });
        }}
      />
    );
  },
};

/**
 * Extra icon buttons before the bell, such as the theme switch. Give each the
 * `p-topbar__iconbtn` class and an `aria-label`.
 * @summary extra icon buttons, such as a theme switch
 */
export const WithActions: Story = {
  args: {
    actions: (
      <button type="button" className="p-topbar__iconbtn" aria-label="Use dark theme" title="Use dark theme">
        <Moon aria-hidden className="size-5 text-(--icon-inverse)" />
      </button>
    ),
  },
};

/**
 * While a form has unsaved changes, the save bar replaces search. Inside a
 * `Frame`, set it on the Frame instead.
 * @summary the unsaved-changes bar replaces search
 */
export const UnsavedChanges: Story = {
  args: {
    contextualSaveBar: {
      message: "Unsaved vehicle",
      saveAction: { content: "Save vehicle", onAction: fn() },
      discardAction: { content: "Discard", onAction: fn() },
    },
  },
};

/**
 * On a phone the logo, name and shortcut hint drop away, and the menu button
 * opens the navigation. A `Frame` sets `onNavigationToggle` for you.
 * @summary phone width: search, buttons and the menu button
 */
export const Narrow: Story = {
  args: { onNavigationToggle: fn() },
  render: (args) => (
    <div style={{ width: 375, maxWidth: "100%" }}>
      <TopBar {...args} />
    </div>
  ),
};
