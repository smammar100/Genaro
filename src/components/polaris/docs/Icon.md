# Icon

Renders one of the 60 Polaris glyphs on a 20×20 grid, inked with `currentColor` (default ink: the `icon` token).

```tsx
import { Icon } from '@/components/polaris';
```

## Use it for
- `Minor` glyphs inside controls (buttons, fields, badges); `Major` glyphs for standalone and navigation use.
- Color only through `tone` (the `icon-*` tokens) — never hard-code a fill. `subdued` for secondary glyphs next to text; `magic` only for Sidekick/AI.
- Most components take an `icon` prop (`Button`, `Badge`, `Banner`, `EmptyState`, menu items) — pass the name there instead of nesting `<Icon>`.
- Available names: AlertMinor, AnalyticsMinor, ArrowLeftMinor, ArrowRightMinor, CancelMajor, CancelMinor, CancelSmallMinor, CaretDownMinor, ChevronDownMinor, ChevronLeftMinor, ChevronRightMinor, ChevronUpMinor, CircleAlertMajor, CircleCancelMinor, CirclePlusOutlineMinor, ClockMajor, ClockMinor, ConversationMinor, CustomersMinor, DeleteMinor, DiscountsMinor, DuplicateMinor, EditMinor, ExitMajor, FilterMinor, FinancesMinor, HideMinor, HomeMinor, HorizontalDotsMinor, InfoMinor, LinkMinor, MarketingMinor, MaximizeMajor, MinusMinor, MobileHamburgerMajor, MobileHorizontalDotsMajor, NotesMinor, NotificationMajor, OrdersMinor, PaymentsMajor, PlayMinor, PlusMinor, PrintMajor, ProductsMinor, QuestionMarkMinor, RiskMajor, RiskMinor, SearchMinor, SelectMinor, SettingsMinor, ShipmentMajor, SidekickMajor, SortAscendingMajor, SortDescendingMajor, SortMinor, StarFilledMinor, TickMinor, TickSmallMinor, ViewMinor, WandMinor. `Icon.names` (or `iconNames`) lists them at runtime.

## Examples

Tones; label an icon only when it carries meaning on its own:

```tsx
<div style={{ display: 'flex', gap: 'var(--space-200)' }}>
  <Icon source="OrdersMinor" />
  <Icon source="TickMinor" tone="success" accessibilityLabel="Paid" />
  <Icon source="AlertMinor" tone="critical" accessibilityLabel="Payment failed" />
  <Icon source="WandMinor" tone="magic" />
</div>
```

Decorative icon beside text:

```tsx
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-100)' }}>
  <Icon source="ShipmentMajor" tone="subdued" />
  Estimated delivery Jul 24
</span>
```

A name that comes from data — check it with `isIconName` (an unknown name renders nothing):

```tsx
import { Icon, isIconName } from '@/components/polaris';

<Icon source={isIconName(item.icon) ? item.icon : 'ProductsMinor'} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `source` | `IconSource` | — | Required. An `IconName` (`'OrdersMinor'`) or any React element, e.g. a lucide-react icon. |
| `tone` | `'base' \| 'subdued' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'critical' \| 'emphasis' \| 'magic' \| 'inherit'` | — | Exported as `IconTone`. Default ink is `icon`; `subdued`/`secondary` use `icon-secondary`; `inherit` takes the parent's text color. |
| `accessibilityLabel` | `string` | — | Makes the icon `role="img"` with that label — for names and element sources alike; omit for decorative icons. |
| `className` | `string` | — | Extra classes on the wrapping `span`. |

## Server Components
Not a client component: render it anywhere. `Icon.names`, `iconNames` and `isIconName` work on the server too.

## Accessibility
- Icons are `aria-hidden` unless they have an `accessibilityLabel`. Icon-only controls get their label from the control (`Button accessibilityLabel`), not the icon.
