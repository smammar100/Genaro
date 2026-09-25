# Toast

A brief, non-disruptive confirmation on the dark `bg-inverse` chrome (`shadow-400`); `error` switches to `bg-fill-critical`.

```tsx
import { Toast } from '@/components/polaris';
```

## Use it for
- Confirming that an action worked, in 3–4 words, noun + past-tense verb: "Product saved", "Order archived", "Message sent".
- Never put critical information in a toast — it goes away. Use a `Banner` instead.
- In apps, always pass `floating`: the toast portals to `<body>` and sits centered 32px above the bottom of the viewport. Show one at a time — floating toasts don't stack.
- At most one action, verb + noun: "View order", "Retry".

## Examples

Confirm a save and auto-dismiss after 4 seconds (Client Component):

```tsx
'use client';
const [message, setMessage] = React.useState<string | null>(null);

<>
  <Button variant="primary" onClick={() => setMessage('Product saved')}>
    Save
  </Button>
  {message ? <Toast content={message} floating duration={4000} onDismiss={() => setMessage(null)} /> : null}
</>
```

An action with `url` renders a link (`hide` clears your toast state):

```tsx
<Toast content="Order created" action={{ content: 'View order', url: '/orders/1021' }} floating duration={5000} onDismiss={hide} />
```

Error with a retry action (`retrySave` is your handler) — no `duration`, so merchants have time to act:

```tsx
<Toast content="Couldn’t save changes" error action={{ content: 'Retry', onAction: retrySave }} floating onDismiss={hide} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `content` | `string` | — | Required. 3–4 words. |
| `onDismiss` | `() => void` | — | Called by the × button and when `duration` ends. Remove the toast here — it doesn't hide itself. |
| `duration` | `number` | — | Auto-dismiss after this many ms. Off by default. The timer starts on mount and restarts only if `duration` changes — an inline `onDismiss` is fine. |
| `error` | `boolean` | — | Critical fill. |
| `action` | `Action` | — | Text action after the message: a link with `url` (`external` supported), otherwise a button that runs `onAction`. |
| `floating` | `boolean` | — | Fixed, bottom-centre, portalled to `<body>`. Without it the toast renders in place. |
| `className` | `string` | — | Extra classes on the toast. |

## Server Components
Client component (`'use client'`). It needs `onDismiss` to go away, so render it from a Client Component that owns the "showing" state. With `floating` it renders nothing on the server and on the first client render — it appears once mounted.

## Accessibility
- The toast is `role="status"` (announced politely); the × is labelled "Dismiss notification" and is always shown.
- Don't put the only way to do something in a toast action — it may disappear before keyboard or screen-reader users reach it.
