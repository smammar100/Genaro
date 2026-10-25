import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DropZone, Tag } from "@/components/genaro";
import guidelines from "../docs/DropZone.md?raw";

/**
 * An upload area that takes files by drag and drop or a click: vehicle
 * photos, V5C scans, a stock list to import. It doesn't list what was added,
 * so show the files next to it.
 */
const meta = {
  title: "Components/Forms/DropZone",
  component: DropZone,
  tags: ["autodocs"],
  parameters: { guidelines },
  args: {
    label: "Documents",
    accept: ".pdf,image/*",
    actionTitle: "Add documents",
    actionHint: "Accepts .pdf, .jpg and .png",
    onDrop: fn(),
  },
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Upload files to a record, such as a vehicle's V5C and service history. Say
 * which formats it takes in the hint.
 * @summary upload files; the hint names the formats
 */
export const Default: Story = {};

/**
 * Show what was added, since the zone itself doesn't: here each file becomes a
 * Tag that can be removed.
 * @summary the zone with the added files listed beside it
 */
export const WithAddedFiles: Story = {
  render: function Render(args) {
    const [files, setFiles] = React.useState<File[]>(() => [
      new File([""], "V5C OY70 TZG.pdf", { type: "application/pdf" }),
      new File([""], "Service history.pdf", { type: "application/pdf" }),
    ]);
    return (
      <div style={{ display: "grid", gap: "var(--space-200)" }}>
        <DropZone
          {...args}
          onDrop={(added) => {
            setFiles((current) => [...current, ...added]);
            args.onDrop?.(added);
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-100)" }}>
          {files.map((file) => (
            <Tag key={file.name} onRemove={() => setFiles((current) => current.filter((f) => f !== file))}>
              {file.name}
            </Tag>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * The page's main media area, such as a vehicle's photos. `large` gives it
 * room and a clear target.
 * @summary large: a page's main media area
 */
export const Large: Story = {
  args: {
    label: "Photos",
    size: "large",
    accept: "image/*",
    actionTitle: "Add photos",
    actionHint: "Accepts .jpg, .png and .webp",
  },
};

/**
 * One file inside a form, such as a stock list to import. `small` keeps it in
 * line with the fields; `allowMultiple={false}` keeps one file.
 * @summary small, one file, inside a form
 */
export const SingleFileSmall: Story = {
  args: {
    label: "Stock list",
    size: "small",
    accept: ".csv",
    allowMultiple: false,
    actionTitle: "Add file",
    actionHint: "Accepts .csv",
  },
};

/**
 * A file that can't be used, or a required one that's missing. The message
 * says what to upload.
 * @summary a wrong or missing file, with an inline error
 */
export const WithError: Story = {
  args: { error: "Upload the V5C as a .pdf, .jpg or .png" },
};

/**
 * Uploads that aren't open right now, such as on a sold vehicle's record.
 * @summary uploads that aren't open right now
 */
export const Disabled: Story = {
  args: { disabled: true },
};
