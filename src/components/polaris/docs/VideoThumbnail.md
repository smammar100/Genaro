# VideoThumbnail

A full-width 16:9 video poster button with a play badge showing the duration, and an optional watched-progress bar.

```tsx
import { VideoThumbnail } from '@/components/polaris';
```

## Use it for
- Tutorial and marketing videos, usually as the media of a `MediaCard`.
- Always pass `videoLength` so merchants see the duration (`2:36`) before committing.
- `videoProgress` shows how much has been watched as a 4px `bg-fill-magic` bar along the bottom.
- The component only renders the poster — play the video yourself in `onClick` (swap in a `<video>`, open a `Modal`, …).

## Examples

Poster that swaps to the video when clicked (Client Component):

```tsx
'use client';
const [playing, setPlaying] = React.useState(false);

return playing ? (
  <video src="/videos/fulfilling-orders.mp4" controls autoPlay style={{ width: '100%' }} />
) : (
  <VideoThumbnail thumbnailUrl="/videos/fulfilling-orders.jpg" videoLength={156} onClick={() => setPlaying(true)} />
);
```

Continue watching inside a `MediaCard` (`resumeVideo` opens your player at the saved position):

```tsx
<MediaCard
  title="Fulfilling your first order"
  description="Pick, pack and ship an order in under three minutes."
  primaryAction={{ content: 'Continue watching', onAction: resumeVideo }}
>
  <VideoThumbnail thumbnailUrl="/videos/fulfilling-orders.jpg" videoLength={156} videoProgress={60} onClick={resumeVideo} />
</MediaCard>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `thumbnailUrl` | `string` | — | Poster image (CSS `background-image`, cover). Without it the poster is `bg-fill-tertiary`. URL-encode spaces and parentheses. |
| `videoLength` | `number` | — | Seconds, floored to whole seconds and shown as `m:ss` (156 → `2:36`); hidden when under 1 or missing. |
| `videoProgress` | `number` | — | Seconds watched, shown as a bar relative to `videoLength`. |
| `onClick` | `() => void` | — | Starts playback. |
| `className` | `string` | — | Extra classes on the button. |

## Server Components
Not a client component itself, but it's a `<button>` that does nothing without `onClick` — render it from a Client Component.

## Accessibility
- The button's label is always "Play video", so keep the video's title visible next to it (e.g. the `MediaCard` title).
- The 2px `border-focus` outline is built in.
