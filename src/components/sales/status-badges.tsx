import { Badge, type BadgeProgress, type BadgeTone } from "@/components/genaro";
import { salesStageLabel } from "@/lib/constants";
import type { StageBehaviour } from "@/lib/types";

interface BadgeSpec {
  tone?: BadgeTone;
  progress?: BadgeProgress;
}

/** Shipped pipeline stages, by how far along the sale they are. */
const DEAL_STAGE: Record<string, BadgeSpec> = {
  new_lead: { progress: "incomplete" },
  contacted: { tone: "info", progress: "incomplete" },
  test_drive: { tone: "info", progress: "incomplete" },
  offer_made: { tone: "attention", progress: "partiallyComplete" },
  deposit_taken: { tone: "success", progress: "partiallyComplete" },
  collection_delivery: { tone: "success", progress: "partiallyComplete" },
  completed_sale: { tone: "success", progress: "complete" },
  lost: { tone: "critical" },
};

/** User-added stages take their tone from the stage's behaviour. */
const BEHAVIOUR: Record<StageBehaviour, BadgeSpec> = {
  open: { progress: "incomplete" },
  reserved: { tone: "success", progress: "partiallyComplete" },
  won: { tone: "success", progress: "complete" },
  lost: { tone: "critical" },
};

/** A sales deal's pipeline stage as a Genaro Badge. */
export function DealStageBadge({
  stage,
  label,
  behaviour,
}: {
  stage: string;
  /** The company's own name for the stage, when it has been renamed. */
  label?: string;
  behaviour?: StageBehaviour;
}) {
  const spec =
    DEAL_STAGE[stage] ?? (behaviour ? BEHAVIOUR[behaviour] : undefined) ?? {};
  return (
    <Badge tone={spec.tone} progress={spec.progress}>
      {label ?? salesStageLabel(stage)}
    </Badge>
  );
}
