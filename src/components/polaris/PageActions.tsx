import { Button } from './Button';
import type { Action } from './types';
import { cx } from './utils';

export interface PageActionsProps {
  /** Usually "Save". */
  primaryAction?: Action & { disabled?: boolean; loading?: boolean; submit?: boolean };
  /** Usually one destructive action, e.g. "Delete product". */
  secondaryActions?: Array<Action & { destructive?: boolean; disabled?: boolean }>;
  className?: string;
}

/** Save / delete row at the bottom of a detail page. */
export function PageActions({ primaryAction, secondaryActions, className }: PageActionsProps) {
  return (
    <div className={cx('p-page-actions', className)}>
      <div className="p-page-actions__secondary">
        {(secondaryActions || []).map((a, i) => (
          <Button key={i} tone={a.destructive ? 'critical' : undefined} onClick={a.onAction} url={a.url} external={a.external} disabled={a.disabled} accessibilityLabel={a.accessibilityLabel} testId={a.testId} id={a.id}>
            {a.content}
          </Button>
        ))}
      </div>
      {primaryAction ? (
        <Button
          variant="primary"
          onClick={primaryAction.onAction}
          url={primaryAction.url}
          external={primaryAction.external}
          submit={primaryAction.submit}
          disabled={primaryAction.disabled}
          loading={primaryAction.loading}
          accessibilityLabel={primaryAction.accessibilityLabel}
          testId={primaryAction.testId}
          id={primaryAction.id}
        >
          {primaryAction.content}
        </Button>
      ) : null}
    </div>
  );
}
