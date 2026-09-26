"use client";

import { Button, Card, TextField } from "@/components/polaris";
import { formatCurrency } from "@/lib/utils";

export type ArrivalTodo = { description: string; cost: number };

/**
 * "Things to do" at arrival: prep work and its cost. The list lives in
 * ArrivalForm (outside react-hook-form) because it is saved as to-dos after
 * the vehicle is created; this card edits it.
 */
export function TodosCard({
  todos,
  newTodo,
  onNewTodoChange,
  onAdd,
  onRemove,
  descriptionId,
  costId,
}: {
  todos: ArrivalTodo[];
  newTodo: ArrivalTodo;
  onNewTodoChange: (update: (prev: ArrivalTodo) => ArrivalTodo) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  descriptionId: string;
  costId: string;
}) {
  return (
    <Card title="Things to do">
      <p className="body-sm text-(--text-secondary)">
        Prep work and its cost. The costs add up to the car&apos;s Total Value
        Addition.
      </p>
      {todos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {todos.map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-(--radius-200) border border-(--border) py-1 pl-2 pr-1 text-xs"
            >
              <span className="flex-1">{t.description}</span>
              <span className="tabular-nums">{formatCurrency(t.cost)}</span>
              <Button
                variant="tertiary"
                size="micro"
                icon="DeleteMinor"
                accessibilityLabel={`Remove ${t.description}`}
                onClick={() => onRemove(i)}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            id={descriptionId}
            label="Description"
            placeholder="e.g. Service, MOT, valet"
            value={newTodo.description}
            onChange={(v) => onNewTodoChange((p) => ({ ...p, description: v }))}
          />
        </div>
        <div className="w-28 shrink-0">
          <TextField
            id={costId}
            label="Cost £"
            type="number"
            step={0.01}
            value={String(newTodo.cost)}
            onChange={(v) => onNewTodoChange((p) => ({ ...p, cost: Math.max(0, Number(v) || 0) }))}
          />
        </div>
        <Button icon="PlusMinor" onClick={onAdd}>
          Add item
        </Button>
      </div>
    </Card>
  );
}
