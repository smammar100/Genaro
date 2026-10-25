import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import {
  CalendarCheck,
  Car,
  FileSpreadsheet,
  LayoutDashboard,
  Megaphone,
  Shield,
  TrendingUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Navigation, NavigationSection, type NavigationItem } from "@/components/genaro";
import guidelines from "../docs/Navigation.md?raw";

const dashboard: NavigationItem = { label: "Dashboard", icon: <LayoutDashboard />, url: "/dashboard" };
const inventory: NavigationItem = { label: "Inventory", icon: <Car />, url: "/vehicles" };
const maintenance: NavigationItem = { label: "Maintenance", icon: <Wrench />, url: "/maintenance/inspection" };
const sales: NavigationItem = { label: "Sales", icon: <TrendingUp />, url: "/sales/leads" };
const warranties: NavigationItem = { label: "Warranties", icon: <Shield />, url: "/warranties" };
const administrative: NavigationItem = {
  label: "Administrative",
  icon: <FileSpreadsheet />,
  url: "/admin/master-sheet",
};

/**
 * The sidebar down the left of the app: one row per area, with the current
 * page's sub-pages under it. Use it as a `Frame`'s `navigation`; to switch
 * views of one list inside a page, use `Tabs`.
 */
const meta = {
  title: "Components/App chrome and navigation/Navigation",
  component: Navigation,
  subcomponents: { NavigationSection },
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  argTypes: { children: { control: false } },
  // The rail fills its parent's height, as it does in a Frame.
  decorators: [
    (Story) => (
      <div style={{ height: "36rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Navigation.Section items={[{ ...dashboard, selected: true }]} />
        <Navigation.Section fill items={[inventory, maintenance, sales, warranties]} />
        <Navigation.Section items={[administrative]} />
      </>
    ),
  },
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The app's rail: Dashboard on its own, the areas a vehicle passes through,
 * then Administrative pushed to the foot by the `fill` section above it.
 * @summary the app's rail, in sections
 */
export const Default: Story = {};

/**
 * The selected area opens to show its pages, with the current page marked.
 * Sub-items only show under the selected item.
 * @summary the current area's pages, under it
 */
export const WithSubNavigation: Story = {
  args: {
    children: (
      <>
        <Navigation.Section items={[dashboard]} />
        <Navigation.Section
          fill
          items={[
            {
              ...inventory,
              selected: true,
              subNavigationItems: [
                { label: "All vehicles", url: "/vehicles", selected: true },
                { label: "Locations", url: "/admin/locations" },
              ],
            },
            maintenance,
            sales,
            warranties,
          ]}
        />
        <Navigation.Section items={[administrative]} />
      </>
    ),
  },
};

/**
 * A count of what's waiting, such as new leads or cars to inspect, so people
 * see where work is piling up.
 * @summary counts of waiting work ("4" new leads)
 */
export const WithBadges: Story = {
  args: {
    children: (
      <>
        <Navigation.Section items={[dashboard]} />
        <Navigation.Section
          fill
          items={[
            inventory,
            { ...maintenance, badge: "6" },
            {
              ...sales,
              selected: true,
              badge: "4",
              subNavigationItems: [
                { label: "Leads", url: "/sales/leads", selected: true, badge: "4" },
                { label: "Appointments", url: "/sales/appointments" },
                { label: "Pipeline", url: "/sales/pipeline" },
              ],
            },
            warranties,
          ]}
        />
        <Navigation.Section items={[administrative]} />
      </>
    ),
  },
};

/**
 * A titled section groups related rows; its `action` adds an icon button by
 * the title, such as adding a lead. The action needs a `title` to show.
 * @summary a titled group with an icon button
 */
export const SectionWithAction: Story = {
  args: {
    children: (
      <>
        <Navigation.Section items={[dashboard]} />
        <NavigationSection
          title="Sales"
          action={{ icon: "PlusMinor", accessibilityLabel: "Add lead", onClick: fn() }}
          items={[
            { label: "Leads", icon: <UserPlus />, url: "/sales/leads", selected: true },
            { label: "Appointments", icon: <CalendarCheck />, url: "/sales/appointments" },
            { label: "Pipeline", icon: <TrendingUp />, url: "/sales/pipeline" },
          ]}
        />
      </>
    ),
  },
};

/**
 * An area people can see but can't open yet, such as Advert before launch. Drop
 * rows people must never reach rather than disabling them.
 * @summary visible but not yet available
 */
export const DisabledItem: Story = {
  args: {
    children: (
      <>
        <Navigation.Section items={[{ ...dashboard, selected: true }]} />
        <Navigation.Section
          fill
          items={[
            inventory,
            maintenance,
            { label: "Advert", icon: <Megaphone />, url: "/advert", disabled: true },
            sales,
            warranties,
          ]}
        />
        <Navigation.Section items={[administrative]} />
      </>
    ),
  },
};
