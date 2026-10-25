import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userEvent, within } from "storybook/test";
import { Banner, Button, ButtonGroup, Card } from "@/components/genaro";
import type { ComboboxOption } from "@/components/genaro";
import { FormCheckbox, FormCombobox, FormSelect, FormSwitch, FormTextField } from "@/components/genaro";
import guidelines from "../docs/Form.md?raw";

const channels = [
  { label: "Walk-in", value: "walk-in" },
  { label: "Phone", value: "phone" },
  { label: "Website", value: "website" },
  { label: "AutoTrader", value: "autotrader" },
  { label: "Facebook Marketplace", value: "facebook" },
];

const vehicles: ComboboxOption[] = [
  ["OY70 TZG", "BMW 320d M Sport", "L-927"],
  ["NA66 XGM", "Ford Fiesta Titanium", "L-904"],
  ["KP19 RWO", "Volkswagen Golf Match", "L-931"],
  ["YD68 HNV", "Audi A3 Sportback S line", "L-918"],
  ["WU17 DFP", "Vauxhall Corsa SRi", "L-889"],
].map(([reg, model, stockId]) => ({ value: stockId, label: `${reg} · ${model}`, description: stockId, keywords: [stockId] }));

const stack = { display: "flex", flexDirection: "column", gap: "var(--space-400)" } as const;

interface Lead {
  customerName: string;
  mobile: string;
  email: string;
  channel: string;
  vehicleId: string;
  financeInterest: boolean;
  marketingConsent: boolean;
}

/** A new-lead form validated with `rules`, as a sales page would hold it. */
function LeadForm() {
  const form = useForm<Lead>({
    mode: "onTouched",
    defaultValues: {
      customerName: "",
      mobile: "",
      email: "",
      channel: "",
      vehicleId: "",
      financeInterest: false,
      marketingConsent: false,
    },
  });
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <form noValidate style={stack} onSubmit={form.handleSubmit((lead) => setSaved(lead.customerName))}>
      {saved ? <Banner tone="success" title={`Lead saved for ${saved}`} onDismiss={() => setSaved(null)} /> : null}
      <Card title="New lead">
        <div style={stack}>
          <FormTextField
            control={form.control}
            name="customerName"
            label="Customer name"
            autoComplete="name"
            requiredIndicator
            rules={{ required: "Enter the customer’s name" }}
          />
          <FormTextField
            control={form.control}
            name="mobile"
            label="Mobile"
            type="tel"
            autoComplete="tel"
            placeholder="07712 345678"
            rules={{
              validate: (mobile, lead) => mobile.trim() !== "" || lead.email.trim() !== "" || "Enter a mobile number or an email address",
              pattern: { value: /^07\d{3} ?\d{6}$/, message: "Enter a UK mobile number, like 07712 345678" },
            }}
          />
          <FormTextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            rules={{ pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter an email address like name@example.com" } }}
          />
          <FormSelect
            control={form.control}
            name="channel"
            label="Lead channel"
            placeholder="Choose a channel"
            options={channels}
            rules={{ required: "Choose where the lead came from" }}
          />
          <FormCombobox
            control={form.control}
            name="vehicleId"
            label="Vehicle of interest"
            options={vehicles}
            prefix="SearchMinor"
            placeholder="Search by reg, stock ID or model"
            clearable
            helpText="Leave it blank if they haven’t chosen a car yet."
          />
          <FormSwitch
            control={form.control}
            name="financeInterest"
            label="Interested in finance"
            helpText="Adds the lead to the finance team’s follow-up queue."
            labelPosition="start"
          />
          <FormCheckbox control={form.control} name="marketingConsent" label="Customer agrees to marketing emails and texts" />
        </div>
      </Card>
      <ButtonGroup>
        <Button variant="primary" submit loading={form.formState.isSubmitting}>
          Save lead
        </Button>
      </ButtonGroup>
    </form>
  );
}

const testDrive = z.object({
  customerName: z.string().trim().min(1, "Enter the customer’s name"),
  vehicleId: z.string().min(1, "Choose the car they want to drive"),
  licenceChecked: z.boolean().refine((checked) => checked, "Check their driving licence before the drive"),
});
type TestDrive = z.infer<typeof testDrive>;

/** A test-drive form validated by a zod schema: the messages live in the schema. */
function TestDriveForm() {
  const form = useForm<TestDrive>({
    resolver: zodResolver(testDrive),
    defaultValues: { customerName: "", vehicleId: "", licenceChecked: false },
  });
  const [booked, setBooked] = React.useState<string | null>(null);
  return (
    <form noValidate style={stack} onSubmit={form.handleSubmit((drive) => setBooked(drive.customerName))}>
      {booked ? <Banner tone="success" title={`Test drive booked for ${booked}`} onDismiss={() => setBooked(null)} /> : null}
      <Card title="Book a test drive">
        <div style={stack}>
          <FormTextField control={form.control} name="customerName" label="Customer name" autoComplete="name" />
          <FormCombobox
            control={form.control}
            name="vehicleId"
            label="Vehicle"
            options={vehicles}
            prefix="SearchMinor"
            placeholder="Search by reg, stock ID or model"
          />
          <FormCheckbox control={form.control} name="licenceChecked" label="Driving licence checked" />
        </div>
      </Card>
      <ButtonGroup>
        <Button variant="primary" submit loading={form.formState.isSubmitting}>
          Book test drive
        </Button>
      </ButtonGroup>
    </form>
  );
}

/**
 * Genaro fields wired to react-hook-form: `FormTextField`, `FormSelect`,
 * `FormCombobox`, `FormCheckbox` and `FormSwitch` take `control` and `name`
 * and show the field's validation message as its error. Use them in every
 * `useForm` form instead of `register()` with a hand-drawn error line; for a
 * form that posts straight to a Server Action, use the plain fields.
 */
const meta = {
  title: "Components/Forms/Form fields",
  component: FormTextField,
  subcomponents: { FormSelect, FormCombobox, FormCheckbox, FormSwitch },
  tags: ["autodocs"],
  parameters: {
    guidelines,
    docs: { story: { inline: false, height: "760px" } },
  },
  args: { name: "customerName", label: "Customer name" },
} satisfies Meta<typeof FormTextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A form people fill in from top to bottom, such as a new lead. Each field
 * checks itself when people leave it, and the form checks them all on save.
 * @summary a lead form with rules on its fields
 */
export const LeadDetails: Story = {
  render: () => <LeadForm />,
};

/**
 * What people see after saving with fields missing: every message under its
 * field, and focus on the first one to fix.
 * @summary messages under each field after a failed save
 */
export const ValidationErrors: Story = {
  render: () => <LeadForm />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Save lead" }));
  },
};

/**
 * Forms with a zod schema keep their messages in the schema; the fields
 * need no `rules`. This is how most of the app's forms validate.
 * @summary validation messages from a zod schema
 */
export const SchemaValidation: Story = {
  render: () => <TestDriveForm />,
};
