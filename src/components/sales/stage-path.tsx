import { cn } from "@/lib/utils";
import type { StageBehaviour } from "@/lib/types";

export interface StagePathStage {
  slug: string;
  label: string;
  behaviour: StageBehaviour;
}

interface StagePathProps {
  /** The pipeline's stages in order. A lost stage is left off the path. */
  stages: StagePathStage[];
  /** The deal's stage. */
  current: string;
  /** Whole days in the current stage, shown under its name. */
  daysInStage?: number;
}

/**
 * A deal's stages as one joined bar: the ones it has passed, the one it is
 * in (with how long it has sat there) and the ones to come, after the
 * Salesforce path and Pipedrive's stage bar. A lost deal greys the whole bar;
 * the page says it was lost.
 * @import import { StagePath } from "@/components/sales/stage-path";
 */
export function StagePath({ stages, current, daysInStage }: StagePathProps) {
  const path = stages.filter((s) => s.behaviour !== "lost");
  const at = path.findIndex((s) => s.slug === current);
  return (
    <ol aria-label="Deal stages" className="flex w-full gap-0.5 overflow-hidden rounded-(--radius-200)">
      {path.map((s, i) => {
        const done = at >= 0 && i < at;
        const here = i === at;
        return (
          <li
            key={s.slug}
            title={s.label}
            aria-current={here ? "step" : undefined}
            className={cn(
              "body-sm flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center px-2 py-1 text-center",
              done && "bg-(--bg-fill-success) text-(--text-success-on-bg-fill)",
              here && "bg-(--bg-fill-info) font-medium text-(--text-info-on-bg-fill)",
              !done && !here && "bg-(--bg-fill-tertiary) text-(--text-secondary)",
            )}
          >
            <span className="w-full truncate">{s.label}</span>
            {here && daysInStage !== undefined ? (
              <span className="body-xs tabular-nums">
                {daysInStage} {daysInStage === 1 ? "day" : "days"}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
