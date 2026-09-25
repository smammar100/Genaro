import { Icon } from './Icon';
import type { Action } from './types';
import { cx } from './utils';

export interface ContextualSaveBarProps {
  /** Defaults to "Unsaved changes". */
  message?: string;
  saveAction?: Action & { disabled?: boolean; loading?: boolean };
  discardAction?: Action;
  /** id of the <form> to submit with Save (type="submit" form={formId}) — works with Server Actions. */
  formId?: string;
  className?: string;
}

/** Unsaved-changes bar that replaces the top bar's search while a form is dirty. Pass it to Frame (or TopBar). */
export function ContextualSaveBar({ message, saveAction, discardAction, formId, className }: ContextualSaveBarProps) {
  return (
    <div className={cx('p-csb', className)}>
      <div className="p-csb__msg">
        <Icon source="RiskMinor" />
        <span>{message || 'Unsaved changes'}</span>
      </div>
      <div className="p-csb__actions">
        {discardAction ? (
          <button type="button" className="p-btn p-btn--medium p-csb__discard" onClick={discardAction.onAction} id={discardAction.id} data-testid={discardAction.testId}>
            <span className="p-btn__label">{discardAction.content || 'Discard'}</span>
          </button>
        ) : null}
        {saveAction ? (
          <button
            type={formId ? 'submit' : 'button'}
            form={formId}
            className="p-btn p-btn--medium p-csb__save"
            onClick={saveAction.onAction}
            disabled={saveAction.disabled || saveAction.loading}
            aria-busy={saveAction.loading || undefined}
            data-testid={saveAction.testId}
            id={saveAction.id}
          >
            <span className="p-btn__label">{saveAction.content || 'Save'}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
