"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import type { PipelineStage, StageBehaviour } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Layout,
  Modal,
  Select,
  SkeletonBodyText,
  TextField,
} from "@/components/polaris";
import { CommitTextField } from "@/components/admin/commit-text-field";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const BEHAVIOUR_LABEL: Record<StageBehaviour, string> = {
  open: "No side effects",
  reserved: "Reserves the car",
  won: "Completes the sale",
  lost: "Releases the car",
};

const BEHAVIOUR_HINT: Record<StageBehaviour, string> = {
  open: "Deals sit here without changing the car.",
  reserved: "The car comes off the forecourt and its advert shows as reserved.",
  won: "The car is stamped sold, the advert closes and the sale is recorded.",
  lost: "A reserved car goes back on the forecourt.",
};

const BEHAVIOUR_TONE: Record<StageBehaviour, string> = {
  open: "text-(--text-secondary)",
  reserved: "text-(--text-warning)",
  won: "text-(--text-success)",
  lost: "text-(--text-critical)",
};

const BEHAVIOUR_OPTIONS = (Object.keys(BEHAVIOUR_LABEL) as StageBehaviour[]).map(
  (b) => ({ label: BEHAVIOUR_LABEL[b], value: b }),
);

const DESCRIPTION =
  "The columns on the sales board, in order. Renaming a stage is safe at any time; deals keep their place.";

/**
 * Settings › Sales Pipeline (GEN-65).
 *
 * Rename, reorder, add and remove the columns on the sales board. Two rules
 * keep a pipeline from being configured into a dead end: removing a stage
 * always moves its deals somewhere valid first, and the stages the sale
 * lifecycle depends on can be renamed and hidden but never deleted outright.
 */
export function PipelineStageSettings() {
  const { company, user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newBehaviour, setNewBehaviour] = useState<StageBehaviour>("open");
  const [removing, setRemoving] = useState<PipelineStage | null>(null);
  const [removalCount, setRemovalCount] = useState<number | null>(null);
  const [moveTo, setMoveTo] = useState("");

  useEffect(() => {
    if (!company) return;
    void pipelineStageService.getAll(company.id).then(setStages);
  }, [company]);

  async function reload() {
    if (!company) return;
    setStages(await pipelineStageService.getAll(company.id));
  }

  async function run(work: () => Promise<void>, success?: string) {
    setBusy(true);
    try {
      await work();
      await reload();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that change");
    } finally {
      setBusy(false);
    }
  }

  function handleRename(stage: PipelineStage, label: string) {
    if (!user || label.trim() === stage.label) return;
    void run(
      () => pipelineStageService.update(stage.id, { label }, user.id).then(),
      "Stage renamed",
    );
  }

  function handleMove(index: number, delta: number) {
    if (!user || !company || !stages) return;
    const next = [...stages];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    // Optimistic: the board order is the whole point of this control, so it
    // should move the instant it's clicked.
    setStages(next);
    void run(
      () =>
        pipelineStageService.reorder(
          company.id,
          next.map((s) => s.id),
          user.id,
        ),
      "Order saved",
    );
  }

  function handleToggle(stage: PipelineStage) {
    if (!user) return;
    void run(
      () =>
        pipelineStageService
          .update(stage.id, { enabled: !stage.enabled }, user.id)
          .then(),
      stage.enabled ? "Stage hidden from the board" : "Stage shown on the board",
    );
  }

  function handleAdd() {
    if (!user || !company) return;
    const label = newLabel.trim();
    if (!label) {
      toast.error("Stage name is required");
      return;
    }
    void run(async () => {
      await pipelineStageService.create(
        { companyId: company.id, label, behaviour: newBehaviour },
        user.id,
      );
      setNewLabel("");
      setNewBehaviour("open");
    }, "Stage added");
  }

  async function openRemoval(stage: PipelineStage) {
    if (!company || !stages) return;
    setRemoving(stage);
    setRemovalCount(null);
    setMoveTo(stages.find((s) => s.id !== stage.id)?.slug ?? "");
    setRemovalCount(
      await pipelineStageService.countDeals(company.id, stage.slug),
    );
  }

  function confirmRemoval() {
    if (!user || !removing || !moveTo) return;
    const stage = removing;
    void run(async () => {
      const { movedDeals } = await pipelineStageService.remove(
        stage.id,
        moveTo,
        user.id,
      );
      setRemoving(null);
      toast.success(
        movedDeals > 0
          ? `"${stage.label}" removed, ${movedDeals} deal${movedDeals === 1 ? "" : "s"} moved`
          : `"${stage.label}" removed`,
      );
    });
  }

  if (!stages) {
    return (
      <Layout>
        <Layout.AnnotatedSection title="Pipeline stages" description={DESCRIPTION}>
          <Card>
            <SkeletonBodyText lines={6} />
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    );
  }

  const moveOptions = stages
    .filter((s) => s.id !== removing?.id)
    .map((s) => ({ label: s.label, value: s.slug }));

  return (
    <Layout>
      <Layout.AnnotatedSection title="Pipeline stages" description={DESCRIPTION}>
        <Card padding="0">
          <ul className="divide-y divide-(--border-secondary)">
            {stages.map((stage, i) => (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  !stage.enabled && "bg-(--bg-surface-secondary)",
                )}
              >
                <span className="flex shrink-0 flex-col">
                  <Button
                    variant="tertiary"
                    size="micro"
                    icon="ChevronUpMinor"
                    accessibilityLabel={`Move ${stage.label} earlier`}
                    disabled={i === 0 || busy}
                    onClick={() => handleMove(i, -1)}
                  />
                  <Button
                    variant="tertiary"
                    size="micro"
                    icon="ChevronDownMinor"
                    accessibilityLabel={`Move ${stage.label} later`}
                    disabled={i === stages.length - 1 || busy}
                    onClick={() => handleMove(i, 1)}
                  />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <CommitTextField
                    value={stage.label}
                    label={`Rename ${stage.label}`}
                    disabled={busy}
                    onCommit={(label) => handleRename(stage, label)}
                  />
                  <span
                    className={cn("px-1 text-xs", BEHAVIOUR_TONE[stage.behaviour])}
                    title={BEHAVIOUR_HINT[stage.behaviour]}
                  >
                    {BEHAVIOUR_LABEL[stage.behaviour]}
                  </span>
                </div>

                {!stage.enabled ? <Badge tone="attention">Hidden</Badge> : null}

                <Button size="micro" disabled={busy} onClick={() => handleToggle(stage)}>
                  {stage.enabled ? "Hide" : "Show"}
                </Button>

                <Button
                  variant="tertiary"
                  tone="critical"
                  size="micro"
                  icon="DeleteMinor"
                  accessibilityLabel={`Remove ${stage.label}`}
                  disabled={busy}
                  onClick={() => void openRemoval(stage)}
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-(--border-secondary) p-4">
            <div className="flex flex-wrap items-end gap-2">
              {/* Enter adds: TextField has no key handler, so listen on the wrapper. */}
              <div
                className="min-w-44 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              >
                <TextField
                  id="new-stage"
                  label="New stage"
                  value={newLabel}
                  onChange={setNewLabel}
                  placeholder="e.g. Awaiting finance"
                />
              </div>
              <div className="w-48">
                <Select
                  id="new-behaviour"
                  label="What it does"
                  options={BEHAVIOUR_OPTIONS}
                  value={newBehaviour}
                  onChange={(v) => setNewBehaviour(v as StageBehaviour)}
                />
              </div>
              <Button icon="PlusMinor" disabled={busy} onClick={handleAdd}>
                Add stage
              </Button>
            </div>
            <p className="text-xs text-(--text-secondary)">
              {BEHAVIOUR_HINT[newBehaviour]}
            </p>
          </div>
        </Card>

        <Modal
          open={removing !== null}
          onClose={() => setRemoving(null)}
          size="small"
          title={`Remove “${removing?.label ?? ""}”?`}
          primaryAction={{
            content: "Remove stage",
            destructive: true,
            loading: busy,
            disabled: !moveTo || removalCount === null,
            onAction: confirmRemoval,
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setRemoving(null) }]}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--text)">
              {removalCount === null
                ? "Checking what's in this stage…"
                : removalCount === 0
                  ? "Nothing is sitting in this stage."
                  : `${removalCount} deal${removalCount === 1 ? " is" : "s are"} in this stage. ${removalCount === 1 ? "It" : "They"} will be moved, not deleted.`}
              {removing?.isSystem
                ? " This is a built-in stage, so it will be hidden from the board rather than deleted: the sale lifecycle still refers to it."
                : ""}
            </p>
            <Select
              id="move-to"
              label="Move any deals to"
              options={moveOptions}
              value={moveTo}
              onChange={setMoveTo}
            />
          </div>
        </Modal>
      </Layout.AnnotatedSection>
    </Layout>
  );
}
