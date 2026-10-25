import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Car, FileSpreadsheet, LayoutDashboard, Shield, TrendingUp, Wrench } from "lucide-react";
import { Card, Frame, Navigation, Page, TextField, TopBar } from "@/components/genaro";
import guidelines from "../docs/Frame.md?raw";

const topBar = (
  <TopBar
    logo="Car Capital"
    storeName="Amira Hussain"
    searchPlaceholder="Search vehicles and pages"
    showSidekick={false}
  />
);

const navigation = (
  <Navigation>
    <Navigation.Section items={[{ label: "Dashboard", icon: <LayoutDashboard />, url: "/dashboard" }]} />
    <Navigation.Section
      fill
      items={[
        {
          label: "Inventory",
          icon: <Car />,
          url: "/vehicles",
          selected: true,
          subNavigationItems: [
            { label: "All vehicles", url: "/vehicles", selected: true },
            { label: "Locations", url: "/admin/locations" },
          ],
        },
        { label: "Maintenance", icon: <Wrench />, url: "/maintenance/inspection" },
        { label: "Sales", icon: <TrendingUp />, url: "/sales/leads", badge: "4" },
        { label: "Warranties", icon: <Shield />, url: "/warranties" },
      ]}
    />
    <Navigation.Section
      items={[{ label: "Administrative", icon: <FileSpreadsheet />, url: "/admin/master-sheet" }]}
    />
  </Navigation>
);

const vehiclesPage = (
  <Page title="All vehicles" fullWidth primaryAction={{ content: "Add vehicle", url: "/vehicles/new" }}>
    <Card title="Forecourt">
      <p className="body-md">42 vehicles in stock. 6 are waiting for inspection.</p>
    </Card>
  </Page>
);

/**
 * The app shell: the top bar across the top, the navigation down the left and
 * the page in a scrolling main area. Render one Frame per app, in the admin
 * layout; for full-screen editors that hide the navigation, use
 * `FullscreenBar` instead.
 */
const meta = {
  title: "Components/App chrome and navigation/Frame",
  component: Frame,
  tags: ["autodocs"],
  parameters: { guidelines, layout: "fullscreen" },
  args: { height: 600, topBar, navigation, children: vehiclesPage },
  argTypes: {
    topBar: { control: false },
    navigation: { control: false },
    children: { control: false },
    contextualSaveBar: { control: false },
  },
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every admin route sits in this shell: top bar, navigation and the page. Give
 * it a height (`"100dvh"` as the page root) so only the main area scrolls.
 * @summary the admin shell: top bar, navigation, page
 */
export const AppShell: Story = {};

/**
 * Routes with no sidebar, such as first-run set-up, keep the top bar and give
 * the page the full width.
 * @summary top bar only, for routes with no sidebar
 */
export const WithoutNavigation: Story = {
  args: { navigation: undefined },
};

/**
 * While a form has unsaved changes, the save bar takes the place of the top
 * bar's search. Pass `undefined` once the changes are saved or discarded.
 * @summary the unsaved-changes bar replaces search
 */
export const UnsavedChanges: Story = {
  args: {
    contextualSaveBar: {
      message: "Unsaved vehicle",
      saveAction: { content: "Save vehicle", onAction: fn() },
      discardAction: { content: "Discard", onAction: fn() },
    },
    children: (
      <Page title="Add vehicle" backAction={{ content: "All vehicles", url: "/vehicles" }}>
        <Card>
          <TextField label="Registration" defaultValue="OY70 TZG" />
        </Card>
      </Page>
    ),
  },
};

/**
 * Below 1040px of its own width, the navigation becomes a drawer that the top
 * bar's menu button slides in. Frame measures itself, not the window.
 * @summary narrow frames: navigation as a drawer
 */
export const NavigationDrawer: Story = {
  render: (args) => (
    <div style={{ width: 375, maxWidth: "100%" }}>
      <Frame {...args} />
    </div>
  ),
};
