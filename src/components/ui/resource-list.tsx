"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRightIcon } from "lucide-react";
import { cloneElement } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

/**
 * Shopify admin nested list: an inner bordered block (1px --border hairline, 8px
 * radius) inside a Card, with rows divided by hairlines. Each row is
 * icon + primary text + secondary text + chevron, hover bg-surface-hover.
 *
 *   <ResourceList>
 *     <ResourceListItem icon={<MailIcon />} title="Email" description="a@b.com" href="/x" />
 *   </ResourceList>
 */
export function ResourceList({
  className,
  render,
  ...props
}: useRender.ComponentProps<"ul">): React.ReactElement {
  const defaultProps = {
    className: cn(
      "flex flex-col divide-y divide-(--border) overflow-hidden rounded-(--radius-200) border border-(--border) bg-(--bg-surface) text-[13px]",
      className,
    ),
    "data-slot": "resource-list",
  };
  return useRender({
    defaultTagName: "ul",
    props: mergeProps<"ul">(defaultProps, props),
    render,
  });
}

type ResourceListItemProps = Omit<
  React.ComponentProps<"li">,
  "title" | "onClick"
> & {
  /** 16px leading icon. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Content shown before the chevron (a badge, a count, a "…" button). */
  trailing?: React.ReactNode;
  /** Makes the row a link. */
  href?: string;
  /** Makes the row a button. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Show the right chevron; defaults to true when the row is interactive. */
  chevron?: boolean;
  /** Custom link element (e.g. Next's <Link />) used when href is set. */
  linkRender?: React.ReactElement;
};

export function ResourceListItem({
  icon,
  title,
  description,
  trailing,
  href,
  onClick,
  chevron,
  linkRender,
  className,
  ...props
}: ResourceListItemProps): React.ReactElement {
  const interactive = Boolean(href || onClick);
  const showChevron = chevron ?? interactive;
  const rowClass = cn(
    "flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left outline-none",
    interactive &&
      "cursor-pointer transition-colors hover:bg-(--bg-surface-hover) active:bg-(--bg-surface-active) focus-visible:bg-(--bg-surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--border-focus)",
  );
  const inner = (
    <>
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center text-(--icon) [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-(--text)">{title}</span>
        {description ? (
          <span className="truncate text-(--text-secondary)">{description}</span>
        ) : null}
      </span>
      {trailing ? (
        <span className="flex shrink-0 items-center gap-2">{trailing}</span>
      ) : null}
      {showChevron ? (
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 text-(--icon-secondary)"
        />
      ) : null}
    </>
  );

  let row: React.ReactElement;
  if (href) {
    row = linkRender ? (
      cloneElement(
        linkRender as React.ReactElement<Record<string, unknown>>,
        { href, className: rowClass, onClick, children: inner },
      )
    ) : (
      <a className={rowClass} href={href} onClick={onClick}>
        {inner}
      </a>
    );
  } else if (onClick) {
    row = (
      <button className={rowClass} onClick={onClick} type="button">
        {inner}
      </button>
    );
  } else {
    row = <div className={rowClass}>{inner}</div>;
  }

  return (
    <li className={cn("min-w-0", className)} data-slot="resource-list-item" {...props}>
      {row}
    </li>
  );
}

/** 28px "…" style icon button for row actions (transparent-fill hover). */
export function RowActionButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">): React.ReactElement {
  return (
    <button
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-(--radius-200) text-(--icon) outline-none transition-colors hover:bg-(--bg-fill-transparent-hover) hover:text-(--icon-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        className,
      )}
      data-slot="row-action-button"
      type={type}
      {...props}
    />
  );
}

/** Small gray Polaris tag/chip: bg-fill-secondary, radius-200, 12px/500. */
export function Chip({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-(--radius-200) bg-(--bg-fill-secondary) px-2 py-0.5 font-medium text-(--text) text-xs leading-4",
        className,
      )}
      data-slot="chip"
      {...props}
    />
  );
}
