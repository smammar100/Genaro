'use client';

import { Icon } from './Icon';
import { isIconName } from './icons';
import { UnstyledLink } from './PolarisProvider';
import type { MenuItem } from './types';
import { cx } from './utils';

export interface ActionListSection {
  title?: string;
  items: MenuItem[];
}

export interface ActionListProps {
  items?: MenuItem[];
  sections?: ActionListSection[];
  /** Called after any item is chosen — close the popover here. */
  onActionAnyItem?: () => void;
  className?: string;
}

/** A menu of actions, usually inside a Popover. */
export function ActionList({ items, sections, onActionAnyItem, className }: ActionListProps) {
  const list = sections || [{ items: items || [] }];
  return (
    <div className={cx('p-actionlist', className)} role="menu">
      {list.map((sec, si) => (
        <div key={si} className="p-actionlist__section">
          {sec.title ? <div className="p-actionlist__title">{sec.title}</div> : null}
          {(sec.items || []).map((it, i) => {
            const cls = cx('p-actionlist__item', it.destructive && 'p-actionlist__item--destructive', it.active && 'p-actionlist__item--active');
            const content = (
              <>
                {it.icon ? <Icon source={it.icon} /> : null}
                <span className="p-actionlist__text">
                  <span>{it.content}</span>
                  {it.helpText ? <span className="p-actionlist__help">{it.helpText}</span> : null}
                </span>
                {it.suffix ? <span className="p-actionlist__suffix">{isIconName(it.suffix) ? <Icon source={it.suffix} /> : it.suffix}</span> : null}
              </>
            );
            const onClick = () => {
              it.onAction?.();
              onActionAnyItem?.();
            };
            if (it.url && !it.disabled) {
              return (
                <UnstyledLink key={i} url={it.url} role="menuitem" className={cls} onClick={onClick}>
                  {content}
                </UnstyledLink>
              );
            }
            return (
              <button key={i} type="button" role="menuitem" disabled={it.disabled} className={cls} onClick={onClick}>
                {content}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
