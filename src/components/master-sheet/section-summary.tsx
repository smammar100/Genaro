"use client";

import { useMemo } from "react";
import { Card, SkeletonDisplayText } from "@/components/polaris";
import {
  formatMetric,
  sectionMetrics,
  type MetricSection,
  type MetricVehicle,
} from "@/lib/master-sheet-metrics";

/**
 * Four summary figures for the selected section tab, computed from the rows
 * the grid is showing (so a search or filter narrows them too).
 */
export function SectionSummary({
  section,
  rows,
}: {
  section: MetricSection;
  /** The grid's rows after search and filters; null while loading. */
  rows: MetricVehicle[] | null;
}) {
  const metrics = useMemo(
    () => (rows ? sectionMetrics(section, rows) : null),
    [section, rows],
  );
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(metrics ?? PLACEHOLDERS).map((m, i) => (
        <Card key={m?.label ?? i}>
          {m ? (
            <>
              <p className="body-sm text-(--text-secondary)">{m.label}</p>
              <p className="heading-lg truncate" title={formatMetric(m)}>
                {formatMetric(m)}
              </p>
            </>
          ) : (
            <>
              <SkeletonDisplayText size="small" />
              <SkeletonDisplayText />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

const PLACEHOLDERS = [null, null, null, null];
