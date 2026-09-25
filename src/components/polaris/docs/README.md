# Polaris components

One file per component: when to use it, examples, every prop, Server Component notes. Import everything from `@/components/polaris`.

"server-safe" components render in Server Components (pass only serializable props — strings, numbers, `url`s, elements); "client" components are `'use client'` files — you can still render them from a Server Component, but callbacks (`onChange`, `onAction`…) must come from a Client Component.

## Actions

| Component | What it's for | Client? |
|---|---|---|
| [Button](./Button.md) | Triggers an action or navigates. One component covers the file's Default, Primary, Critical, Success, Tertiary, Plain and Icon button sets. | server-safe |
| [ButtonGroup](./ButtonGroup.md) | Lays out related buttons 8px apart (`space-button-group-gap`), or joins them into one segmented control. | server-safe |
| [Link](./Link.md) | Inline text link (`text-link`, darkens on hover). Internal URLs go through the router link from `PolarisProvider`; with `onClick` and no `url` it renders a link-styled button. | server-safe |
| [SplitButton](./SplitButton.md) | A main action plus a chevron that opens a menu of related alternatives (the file's Split button set). | client |
| [PageActions](./PageActions.md) | The action row at the bottom of a detail page: primary action on the right, secondary and destructive actions on the left, above a top border. | server-safe |

## Layout and structure

| Component | What it's for | Client? |
|---|---|---|
| [Page](./Page.md) | The page header plus the content column below it. The header can hold a back button, a title with badges, a subtitle, secondary and primary actions, and pagination. The content column has a constrained width. | server-safe |
| [Layout](./Layout.md) | Arranges cards into the standard page columns: full width, two-thirds plus one-third, halves, and annotated sections for settings pages. | server-safe |
| [Grid](./Grid.md) | The admin column grid: 6 columns at xs–md and 12 columns at lg–xl, with 16px (`space-400`) gutters. Breakpoints follow the grid's own width. | server-safe |
| [Card](./Card.md) | A white `bg-surface` container that groups related content and actions, with 12px corners, `shadow-100` and 16px padding (`space-card-padding`). | server-safe |
| [Divider](./Divider.md) | A 1px horizontal rule (`<hr>`) that separates sections inside a card. | server-safe |
| [CalloutCard](./CalloutCard.md) | A card that promotes a feature or a next step, with a title, short copy, an illustration and actions. | server-safe |
| [MediaCard](./MediaCard.md) | A flush card that pairs an image or video with a title, a description and actions. | server-safe |
| [AccountConnection](./AccountConnection.md) | A card for connecting or disconnecting a third-party account, such as a marketing channel, a shipping carrier or an app. | server-safe |
| [DescriptionList](./DescriptionList.md) | Term–description pairs in two equal columns, separated by `border-secondary` rules. | server-safe |

## Lists and tables

| Component | What it's for | Client? |
|---|---|---|
| [IndexTable](./IndexTable.md) | The main list view for orders, products and customers, in a flush card. It combines saved-view tabs, search and filter, sortable headings, selectable rows with a floating bulk-actions bar, and pagination. | client |
| [DataTable](./DataTable.md) | A read-only table of numbers for reports and analytics, in a flush card, with an optional totals row and footer. | server-safe |
| [ResourceList](./ResourceList.md) | A flush card that lists customers, locations or other resources. Each row shows media, a name, metadata and a badge. The header shows a count, and the list supports selection, sorting and bulk actions. `ResourceItem` is a standalone row for your own lists. | client |

## Forms

| Component | What it's for | Client? |
|---|---|---|
| [TextField](./TextField.md) | Single- or multi-line text input with label, help text and inline error (the file's Text field, Number field and Multiline text field sets). | client |
| [Select](./Select.md) | A native `<select>` styled as a Polaris field, with `SelectMinor` chevrons. | client |
| [Checkbox](./Checkbox.md) | Toggles a single option on or off; supports the indeterminate state for "select all". | client |
| [RadioButton](./RadioButton.md) | One option in a mutually exclusive set; radios with the same `name` form a group. | client |
| [ChoiceList](./ChoiceList.md) | A titled group of radio buttons (one choice) or checkboxes (`allowMultiple`), rendered as a `fieldset` with a `legend`. | client |
| [RangeSlider](./RangeSlider.md) | Selects a number, or a low–high range with two thumbs, along a track (3px `input-border` track, `bg-fill-brand` fill and thumbs). | client |
| [DropZone](./DropZone.md) | A file upload area that accepts drag-and-drop or a click, styled like an input with a secondary "Add files" button. | client |
| [ColorPicker](./ColorPicker.md) | Picks a color with a 160px saturation/brightness square, a hue slider and an optional alpha slider. Values are HSB(A), not hex. | client |
| [DatePicker](./DatePicker.md) | A month calendar for picking a date or a date range, on its own raised surface (`shadow-300`). Selected days use `bg-fill-brand-selected`; days between use `bg-surface-brand-selected`. | client |
| [Tag](./Tag.md) | A keyword attached to an object — plain, removable (×) or clickable (the file's Tag, Removable tag and Clickable tag sets). | server-safe |
| [Filters](./Filters.md) | Search and filter controls for index lists: a query field plus filter pills. `FilterPill` is the single pill, exported for building your own filter bar. | server-safe |
| [SettingToggle](./SettingToggle.md) | A card that shows whether a setting is on or off — title, an On/Off badge and one toggle button. | server-safe |
| [InlineError](./InlineError.md) | A one-line validation message with the `AlertMinor` icon, in `text-critical` / `icon-critical`. | server-safe |
| [Labelled](./Labelled.md) | The label, help text and error wrapper that TextField and Select use. Wrap your own controls in it so they match the kit's fields. | server-safe |

## Feedback and status

| Component | What it's for | Client? |
|---|---|---|
| [Badge](./Badge.md) | A compact pill that shows the status of an object — product status, payment, fulfillment (the file's Badge set: tones × progress × strong). | server-safe |
| [Banner](./Banner.md) | A prominent, persistent message about the page or a task, in `info`, `success`, `warning` or `critical` tone (the file's Banner and Banner-with-no-title sets). | server-safe |
| [Toast](./Toast.md) | A brief, non-disruptive confirmation on the dark `bg-inverse` chrome (`shadow-400`); `error` switches to `bg-fill-critical`. | client |
| [Tooltip](./Tooltip.md) | A small floating label (white `bg-surface`, `shadow-300`, 8px corners, with a tail) shown while its trigger is hovered or focused. | client |
| [Spinner](./Spinner.md) | An indeterminate loading indicator in `bg-fill-brand`. | server-safe |
| [ProgressBar](./ProgressBar.md) | Shows the progress of a determinate task as a filled track (`bg-fill-tertiary` track, toned fill). | server-safe |
| [Skeleton](./Skeleton.md) | Pulsing placeholders shown while content loads: `SkeletonDisplayText` for headings, `SkeletonBodyText` for paragraphs, `SkeletonThumbnail` for images. | server-safe |
| [EmptyState](./EmptyState.md) | Explains why a page or section is empty and what to do next: a centered illustration or icon tile, heading, body and actions on its own card surface. | server-safe |
| [ExceptionList](./ExceptionList.md) | A compact list of notable exceptions about an order or customer: a dot or icon, an optional bold title and a description. | server-safe |

## Images and icons

| Component | What it's for | Client? |
|---|---|---|
| [Icon](./Icon.md) | Renders one of the 60 Polaris glyphs on a 20×20 grid, inked with `currentColor` (default ink: the `icon` token). | server-safe |
| [Avatar](./Avatar.md) | Represents a customer, staff member or store with an image, initials or the grey placeholder silhouette. | server-safe |
| [Thumbnail](./Thumbnail.md) | A small product or file preview on `bg-surface-secondary` with a hairline `shadow-border-inset` edge. | server-safe |
| [VideoThumbnail](./VideoThumbnail.md) | A full-width 16:9 video poster button with a play badge showing the duration, and an optional watched-progress bar. | server-safe |
| [KeyboardKey](./KeyboardKey.md) | Displays a keyboard key or shortcut as a `<kbd>` keycap. | server-safe |

## App chrome and navigation

| Component | What it's for | Client? |
|---|---|---|
| [Frame](./Frame.md) | The admin app shell: a 56px `TopBar` on `bg-inverse`, the 240px `Navigation` on `nav-bg`, and a scrolling main area on `bg`. | client |
| [TopBar](./TopBar.md) | The dark 56px admin header on `bg-inverse`. It holds the logo, a search field with a ⌘K hint, the Sidekick and notifications buttons, and the store menu (name plus avatar). | client |
| [Navigation](./Navigation.md) | The admin sidebar: 240px wide on `nav-bg`, with 28px items and 20px icons. The selected item is a raised white pill (`nav-bg-surface-selected`), and its sub-items expand below it. | server-safe |
| [Tabs](./Tabs.md) | Switches between views of the same content, such as All · Unfulfilled · Unpaid, using pill tabs on transparent fills. | client |
| [Pagination](./Pagination.md) | Previous and next buttons on `bg-fill-tertiary` for paged lists, with an optional label between them. | server-safe |
| [FooterHelp](./FooterHelp.md) | A centered help line at the bottom of a page, linking to documentation. | server-safe |
| [FullscreenBar](./FullscreenBar.md) | A 56px white header for full-screen editors. It has an Exit button (`ExitMajor`), a title with an optional badge, and actions on the right. | server-safe |
| [ContextualSaveBar](./ContextualSaveBar.md) | The unsaved-changes bar on `bg-inverse`: a `RiskMinor` icon and a message on the left, and Discard and Save buttons on the right. It takes the place of the top bar's search while a form is dirty. | server-safe |

## Overlays

| Component | What it's for | Client? |
|---|---|---|
| [Modal](./Modal.md) | A dialog for focused tasks and confirmations. It has `radius-500` corners and `shadow-600`, a `bg-surface-tertiary` header with a close button, and a bordered footer for the actions. | client |
| [Popover](./Popover.md) | A floating panel (`shadow-300`, 12px `border-radius-popover`) anchored below or above its activator. It holds an ActionList, an OptionList or a short form. | client |
| [ActionList](./ActionList.md) | A menu of actions, usually shown inside a Popover. Each row is 32px, with an optional icon, help text and suffix. | client |
| [OptionList](./OptionList.md) | A list of options to pick from. A tick (`TickMinor`) marks the chosen item, and `allowMultiple` switches to checkboxes. | client |

## App setup

| Component | What it's for | Client? |
|---|---|---|
| [PolarisProvider](./PolarisProvider.md) | An optional app-level provider that sends every internal `url` through your router's link component. That covers Button, Link, Navigation items, IndexTable rows, Page and card actions, and every other component with a `url`. `UnstyledLink` is the anchor they all render, and you can use it for your own clickable elements. | client |
