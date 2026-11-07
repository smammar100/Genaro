# Toast

A brief, non-disruptive confirmation (after React Bits' Swipe Toast, 2026-11-07). It rises from the bottom on the brand fill (`bg-fill-brand`: dark in light mode, white in dark mode), with `shadow-400` and `radius-300`; `error` switches to `bg-fill-critical`. While a `duration` runs, a 2px line burns down along its foot; hovering or focusing the toast pauses it. Swipe it down (or press Escape while it has focus) to dismiss it; let go early and it springs back.

```tsx
import { Toast } from '@/components/genaro';
```

## Use it for
- Confirming that an action worked, in 3–4 words, noun + past-tense verb: "Product saved", "Order archived", "Message sent".
- Never put critical information in a toast — it goes away. Use a `Banner` instead.
- In apps, use `toast.*` from `@/lib/toast`: the app's Toaster stacks up to three at the bottom centre, and the gap closes as one leaves. A one-off `floating` toast portals to `<body>` and sits centred 32px above the bottom.
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
| `onDismiss` | `() => void` | — | Called once the toast has gone: after its exit from the × button, a swipe, Escape, the action, or the end of `duration`. Remove the toast here. |
| `duration` | `number` | — | Goes by itself after this many ms, with the timer line burning down. Off by default. Pauses while hovered, focused, dragged or while the tab is hidden. The timer starts on mount and restarts only if `duration` changes — an inline `onDismiss` is fine. |
| `error` | `boolean` | — | Critical fill. |
| `action` | `Action` | — | A small inverted button after the message: a link with `url` (`external` supported), otherwise a button that runs `onAction`. Using it closes the toast. |
| `floating` | `boolean` | — | Fixed, bottom-centre, portalled to `<body>`. Without it the toast renders in place. |
| `className` | `string` | — | Extra classes on the toast. |

## Server Components
Client component (`'use client'`). It needs `onDismiss` to go away, so render it from a Client Component that owns the "showing" state. With `floating` it renders nothing on the server and on the first client render — it appears once mounted.

## Accessibility
- The toast is `role="status"` (announced politely), or `role="alert"` for errors; the × is labelled "Dismiss notification" and is always shown, so swiping is never the only way out. The toast takes focus with Tab, and Escape dismisses it.
- Don't put the only way to do something in a toast action — it may disappear before keyboard or screen-reader users reach it.
