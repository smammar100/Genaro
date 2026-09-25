import * as React from 'react';
import { cx } from './utils';

export interface LayoutProps {
  children?: React.ReactNode;
  className?: string;
}

export interface LayoutSectionProps {
  /** `fullWidth` (default) · `oneHalf` · `oneThird` (the sidebar column on detail pages). */
  variant?: 'fullWidth' | 'oneHalf' | 'oneThird';
  /** @deprecated use variant="oneThird" */
  secondary?: boolean;
  /** @deprecated use variant="oneHalf" */
  oneHalf?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface LayoutAnnotatedSectionProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

function LayoutBase({ children, className }: LayoutProps) {
  return <div className={cx('p-layout', className)}>{children}</div>;
}

/** A column of the page layout. Also available as `Layout.Section`. */
export function LayoutSection({ variant, secondary, oneHalf, children, className }: LayoutSectionProps) {
  const v = variant || (secondary ? 'oneThird' : oneHalf ? 'oneHalf' : 'fullWidth');
  return <div className={cx('p-layout__section', `p-layout__section--${v}`, className)}>{children}</div>;
}

/** Settings-style row: title and description on the left, cards on the right. Also available as `Layout.AnnotatedSection`. */
export function LayoutAnnotatedSection({ title, description, children, className }: LayoutAnnotatedSectionProps) {
  return (
    <div className={cx('p-layout__annotated', className)}>
      <div className="p-layout__annotation">
        <h2 className="p-layout__annotation-title">{title}</h2>
        {description ? <div className="p-layout__annotation-desc">{description}</div> : null}
      </div>
      <div className="p-layout__annotated-content">{children}</div>
    </div>
  );
}

/** Page-level column layout: a main column plus a one-third sidebar, halves, or annotated sections. Stacks below 768px. */
export const Layout = Object.assign(LayoutBase, { Section: LayoutSection, AnnotatedSection: LayoutAnnotatedSection });
