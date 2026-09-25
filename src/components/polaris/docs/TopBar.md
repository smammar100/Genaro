# TopBar

The dark 56px admin header on `bg-inverse`. It holds the logo, a search field with a ⌘K hint, the Sidekick and notifications buttons, and the store menu (name plus avatar).

```tsx
import { TopBar } from '@/components/polaris';
```

## Use it for
- The `topBar` of a `Frame`. Frame adds the hamburger (`onNavigationToggle`) and passes down its own `contextualSaveBar`, so you usually set only `logo`, `storeName` and the search props.
- `logo` takes text or any node, such as an `<img>`. The logo area is 224px wide on desktop. `storeName` labels the store menu and supplies the avatar initials; it defaults to "Store".
- Search: `searchPlaceholder` defaults to "Search". For a controlled field, pass `searchValue` and `onSearchChange` together. The field has no submit, so act on `onSearchChange`, for example by debouncing and then routing to your search page.
- To use the field as the entry point to a command palette, pass `onSearchFocus` and open the palette there. Blur the field first (`document.activeElement.blur()`), or the dialog hands focus back to it on close and reopens itself. `searchId` puts an id on the field for anchors such as a tour step.
- `unreadNotifications` adds a red dot (`bg-fill-critical`). `showSidekick={false}` hides the `SidekickMajor` button.
- TopBar responds to its own width. Below 1040px the logo shrinks to fit its content, and the hamburger appears when `onNavigationToggle` is set. Below 768px the logo, store name, ⌘K hint and Sidekick button are hidden.
- `onSidekickClick`, `onNotificationsClick` and `onUserMenuClick` handle the three buttons on the right. Open a Popover, sheet or page from them. The ⌘K hint is visual only; no shortcut is bound.

## Examples

Static props, which work from a Server Component. Frame adds the hamburger:

```tsx
<TopBar
  logo="Stellar Interiors"
  storeName="Stellar Interiors"
  searchPlaceholder="Search orders, products and customers"
  unreadNotifications
/>
```

Controlled search, an image logo and button handlers (Client Component):

```tsx
'use client';
const [query, setQuery] = React.useState('');
const [panel, setPanel] = React.useState<'notifications' | 'account' | null>(null); // which panel your UI shows

<TopBar
  logo={<img src="/logo-inverse.svg" alt="Stellar Interiors" height={24} />}
  storeName="Stellar Interiors"
  searchValue={query}
  onSearchChange={setQuery}
  showSidekick={false}
  onNotificationsClick={() => setPanel('notifications')}
  onUserMenuClick={() => setPanel('account')}
/>
```

Unsaved changes without a Frame. The bar takes the place of the search field while it is set (Client Component):

```tsx
'use client';
const [dirty, setDirty] = React.useState(false);

<TopBar
  logo="Stellar Interiors"
  storeName="Stellar Interiors"
  contextualSaveBar={
    dirty
      ? {
          saveAction: { content: 'Save', onAction: () => setDirty(false) },
          discardAction: { content: 'Discard', onAction: () => setDirty(false) },
        }
      : undefined
  }
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `logo` | `ReactNode` | — | Store logo or name, on the left. |
| `storeName` | `string` | `'Store'` | Shown beside the avatar and used for its initials. |
| `searchPlaceholder` | `string` | `'Search'` | |
| `searchValue` | `string` | — | Controlled value. Pass it together with `onSearchChange`. |
| `onSearchChange` | `(value: string) => void` | — | Client Components only. |
| `onSearchFocus` | `() => void` | — | Called when the search field gains focus. Client Components only. |
| `searchId` | `string` | — | DOM id on the search field's wrapper, for example an onboarding-tour anchor. |
| `onNavigationToggle` | `() => void` | — | Shows the hamburger below 1040px. Frame sets it when it has a `navigation`. |
| `showSidekick` | `boolean` | `true` | The `SidekickMajor` button. |
| `onSidekickClick` | `() => void` | — | Called by the Sidekick button. |
| `unreadNotifications` | `boolean` | — | Red dot on the notifications button. |
| `onNotificationsClick` | `() => void` | — | Called by the notifications button. |
| `onUserMenuClick` | `() => void` | — | Called by the store name and avatar button. Open your account menu here. |
| `contextualSaveBar` | `ContextualSaveBarProps` | — | Replaces the search with the unsaved-changes bar. Frame's own prop overrides it. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
TopBar is a client component. A Server Component can pass data props: `logo`, `storeName`, `searchPlaceholder`, `unreadNotifications` and `showSidekick`. `onSearchChange`, the three button handlers, `onNavigationToggle` and a `contextualSaveBar` with actions all need a Client Component. When TopBar sits inside a Frame, the Frame supplies the toggle.

## Accessibility
- The search input is labelled "Search". The icon buttons are labelled "Sidekick", "Notifications" and "Toggle menu", and the store menu button is named by `storeName`.
- An image `logo` needs `alt` text.
