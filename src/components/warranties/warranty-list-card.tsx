"use client";

import type * as React from "react";
import { Card, SkeletonBodyText, TextField } from "@/components/polaris";

interface WarrantyListCardProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  /** Rows still loading: show a skeleton in place of the table. */
  loading: boolean;
  children: React.ReactNode;
}

/**
 * The index card shared by the three warranty views: a search field in the
 * top bar, then the table (or its empty state) flush below. The view tabs
 * (`FilterChips`) sit on their own row under the page header.
 */
export function WarrantyListCard({
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  loading,
  children,
}: WarrantyListCardProps) {
  return (
    <Card padding="0">
      <div className="border-b border-(--border) p-2">
        <div className="w-full sm:w-72">
          <TextField
            label={searchLabel}
            labelHidden
            type="search"
            prefix="SearchMinor"
            value={query}
            onChange={onQueryChange}
            clearButton
            onClearButtonClick={() => onQueryChange("")}
            placeholder={searchPlaceholder}
          />
        </div>
      </div>
      {loading ? (
        <div className="p-4">
          <SkeletonBodyText lines={6} />
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
