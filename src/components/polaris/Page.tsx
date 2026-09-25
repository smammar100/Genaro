import * as React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Pagination, type PaginationProps } from './Pagination';
import { UnstyledLink } from './PolarisProvider';
import type { Action, IconSource } from './types';
import { cx } from './utils';

export interface PageSecondaryAction {
  content?: string;
  icon?: IconSource;
  destructive?: boolean;
  disabled?: boolean;
  /** Required when the action is icon-only. */
  accessibilityLabel?: string;
  onAction?: () => void;
  url?: string;
  /** Rendered as `data-testid` on the action's button or link. */
  testId?: string;
  /** DOM id on the action's button or link, e.g. an onboarding-tour anchor. */
  id?: string;
}

export interface PageProps {
  /** Page title (heading-lg). */
  title?: string;
  subtitle?: string;
  /** Badges beside the title (e.g. order status). */
  titleMetadata?: React.ReactNode;
  /** A dropdown-style button after the title, e.g. "All locations". */
  titlePicker?: Action;
  /** Back arrow to the parent index page. */
  backAction?: Action;
  /** The page's one primary action. */
  primaryAction?: Action & { disabled?: boolean; loading?: boolean };
  secondaryActions?: PageSecondaryAction[];
  /** Previous / next record (detail pages). */
  pagination?: PaginationProps;
  /** Index pages: use the full width. */
  fullWidth?: boolean;
  /** Settings pages: 662px. Default detail width is 998px. */
  narrowWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** Page header (title, actions, back, pagination) plus the width-constrained content column. */
export function Page({
  title, subtitle, titleMetadata, titlePicker, backAction, primaryAction, secondaryActions, pagination, fullWidth, narrowWidth, children, className,
}: PageProps) {
  return (
    <div className={cx('p-page', fullWidth && 'p-page--full', narrowWidth && 'p-page--narrow', className)}>
      {title || backAction ? (
        <div className="p-page__header">
          <div className="p-page__titlewrap">
            {backAction ? (
              <Button variant="tertiary" icon="ArrowLeftMinor" accessibilityLabel={backAction.content || 'Back'} onClick={backAction.onAction} url={backAction.url} testId={backAction.testId} id={backAction.id} />
            ) : null}
            <div>
              <div className="p-page__titleline">
                <h1 className="p-page__title">{title}</h1>
                {titlePicker ? (
                  <button type="button" className="p-page__picker" onClick={titlePicker.onAction}>
                    <span>{titlePicker.content}</span>
                    <Icon source="ChevronDownMinor" />
                  </button>
                ) : null}
                {titleMetadata || null}
              </div>
              {subtitle ? <p className="p-page__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <div className="p-page__actions">
            {(secondaryActions || []).map((a, i) => {
              const iconOnly = !!a.icon && !a.content;
              const cls = cx('p-page__secondary', a.destructive && 'p-page__secondary--critical', iconOnly && 'p-page__secondary--icon');
              const inner = (
                <>
                  {a.icon ? <Icon source={a.icon} /> : null}
                  {a.content ? <span>{a.content}</span> : null}
                </>
              );
              if (a.url && !a.disabled) {
                return (
                  <UnstyledLink key={i} url={a.url} className={cls} onClick={a.onAction} aria-label={iconOnly ? a.accessibilityLabel : undefined} id={a.id} data-testid={a.testId}>
                    {inner}
                  </UnstyledLink>
                );
              }
              return (
                <button key={i} type="button" className={cls} onClick={a.onAction} disabled={a.disabled} aria-label={iconOnly ? a.accessibilityLabel : undefined} id={a.id} data-testid={a.testId}>
                  {inner}
                </button>
              );
            })}
            {primaryAction ? (
              <Button variant="primary" onClick={primaryAction.onAction} url={primaryAction.url} disabled={primaryAction.disabled} loading={primaryAction.loading} testId={primaryAction.testId} id={primaryAction.id}>
                {primaryAction.content}
              </Button>
            ) : null}
            {pagination ? <Pagination {...pagination} /> : null}
          </div>
        </div>
      ) : null}
      <div className="p-page__content">{children}</div>
    </div>
  );
}
