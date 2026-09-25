# MediaCard

A flush card that pairs an image or video with a title, a description and actions.

```tsx
import { MediaCard } from '@/components/polaris';
```

## Use it for
- Education and feature announcements, such as a video walkthrough or an app you recommend.
- The media goes in `children`: an `<img>` sized to fill its box (`width: 100%`, `object-fit: cover`) or a `VideoThumbnail`.
- Without `portrait`, the media sits on top and the text below, which fits narrow columns like a one-third section. With `portrait`, the media takes the left 40% and the text sits beside it, which suits wide columns.
- `primaryAction` renders a default Button and `secondaryAction` a tertiary one. The description is 12px text.
- MediaCard is already a card, so don't wrap it in `Card`.

## Examples

A video, with the media on top:

```tsx
<MediaCard
  title="Turn your side project into a business"
  description="You have a great product. Now it’s time to test your idea and start selling."
  primaryAction={{ content: 'Watch the course', url: '/learn/start-selling' }}
>
  <VideoThumbnail videoLength={156} thumbnailUrl="/videos/start-selling.jpg" />
</MediaCard>
```

An image beside the text, with a secondary action:

```tsx
<MediaCard
  portrait
  title="Sell in person with Point of Sale"
  description="Accept payments at markets and pop-ups with the same inventory as your online store."
  primaryAction={{ content: 'Set up Point of Sale', url: '/point-of-sale' }}
  secondaryAction={{ content: 'Learn more', url: '/help/point-of-sale' }}
>
  <img src="/images/point-of-sale.jpg" alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
</MediaCard>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Required. `heading-sm`, rendered as an `<h2>`. |
| `description` | `string` | — | 12px text under the title. |
| `children` | `ReactNode` | — | The media. |
| `primaryAction` | `Action` | — | Default button. |
| `secondaryAction` | `Action` | — | Tertiary button. Uses `content`, `url` and `onAction`. |
| `portrait` | `boolean` | — | Media on the left (40%) with the text beside it. Without it, the media is on top. |
| `size` | `'small' \| 'medium'` | `'medium'` | Reserved: `small` has no visual effect yet. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
MediaCard is not a client component. Render it from a Server Component with `url` actions. `onAction` needs a Client Component, and so does a `VideoThumbnail`'s `onClick`.

## Accessibility
- Decorative images take `alt=""`. When the image carries information the text doesn't, describe it in `alt`.
- `VideoThumbnail` is a button labelled "Play video".
