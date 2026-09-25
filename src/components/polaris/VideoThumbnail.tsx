import { Icon } from './Icon';
import { cx } from './utils';

export interface VideoThumbnailProps {
  thumbnailUrl?: string;
  /** Seconds. */
  videoLength?: number;
  /** Seconds watched. */
  videoProgress?: number;
  onClick?: () => void;
  className?: string;
}

/** Video poster with a play button, duration and progress. */
export function VideoThumbnail({ thumbnailUrl, videoLength, videoProgress, onClick, className }: VideoThumbnailProps) {
  const t = Math.floor(videoLength || 0);
  const mm = Math.floor(t / 60);
  const ss = String(t % 60).padStart(2, '0');
  return (
    <button
      type="button"
      className={cx('p-videothumb', className)}
      onClick={onClick}
      style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
      aria-label="Play video"
    >
      <span className="p-videothumb__play">
        <Icon source="PlayMinor" />
        {t ? <span>{`${mm}:${ss}`}</span> : null}
      </span>
      {videoProgress ? <span className="p-videothumb__progress" style={{ width: `${Math.min(100, (videoProgress / t) * 100)}%` }} /> : null}
    </button>
  );
}
