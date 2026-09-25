# AccountConnection

A card for connecting or disconnecting a third-party account, such as a marketing channel, a shipping carrier or an app.

```tsx
import { AccountConnection } from '@/components/polaris';
```

## Use it for
- Settings and app pages where the merchant links an external account.
- Not connected: shows `title`, the status "No account connected" and a **primary** action button, usually "Connect".
- Connected: shows an avatar and `accountName` as the title, "Account connected", and a **secondary** action button, usually "Disconnect".
- `details` replaces the status line, for example with the connected handle or email.
- `avatarUrl` shows an image avatar (32px, `lg`). When connected without one, the avatar shows the initials of `accountName`.
- `termsOfService` goes below the header: one sentence with a `Link`.

## Examples

Not connected. A `url` action (for example a Route Handler that starts OAuth) works from a Server Component:

```tsx
<AccountConnection
  title="Instagram"
  action={{ content: 'Connect', url: '/api/instagram/connect' }}
  termsOfService={
    <>
      By clicking Connect, you agree to accept the <Link url="/legal/instagram-terms">Instagram sales channel terms</Link>.
    </>
  }
/>
```

Connected, with the connection toggled in state (Client Component):

```tsx
'use client';
const [connected, setConnected] = React.useState(true);

<AccountConnection
  title="Instagram"
  accountName="Stellar Interiors"
  connected={connected}
  details={connected ? '@stellarinteriors' : undefined}
  action={
    connected
      ? { content: 'Disconnect', onAction: () => setConnected(false) }
      : { content: 'Connect', onAction: () => setConnected(true) }
  }
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Title while not connected, e.g. "Instagram". |
| `accountName` | `string` | — | Title once connected. It also supplies the avatar initials. |
| `connected` | `boolean` | — | Switches the title, the status text and the button variant. |
| `avatarUrl` | `string` | — | Image avatar. Shown whenever it's set. |
| `details` | `ReactNode` | — | Replaces "Account connected" / "No account connected". |
| `action` | `Action` | — | Primary when disconnected, secondary when connected. Uses `content`, `url` and `onAction`. |
| `termsOfService` | `ReactNode` | — | Shown below the header. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
AccountConnection is not a client component. Render it from a Server Component with a `url` action. `onAction` needs a Client Component.
