"use client";

import { Controller } from "react-hook-form";
import { Search } from "lucide-react";
import { Card, Checkbox, Select } from "@/components/polaris";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { LOG_BOOK_SUGGESTIONS } from "@/lib/master-sheet";
import type { User } from "@/lib/types";
import { Field, Important } from "./fields";
import { SERVICE_HISTORY_OPTIONS, type ArrivalFormApi, type FieldIds } from "./schema";

/** Receiving (sheet AJ–BA): when the car arrived, and what came with it. */
export function ReceivingCard({
  form,
  ids,
  users,
}: {
  form: ArrivalFormApi;
  ids: FieldIds;
  users: User[];
}) {
  const errors = form.formState.errors;

  return (
    <Card title="Receiving">
      <p className="body-sm text-(--text-secondary)">
        When the car arrived, and what came with it
      </p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field label={<>Vehicle receiving date <Important /></>} htmlFor={ids.receivedDate}>
          <Input id={ids.receivedDate} type="date" {...form.register("receivedDate")} />
        </Field>
        <Field label="Received by" htmlFor={ids.receivedBy}>
          <Controller
            control={form.control}
            name="receivedBy"
            render={({ field }) => (
              <EmployeeCombobox
                id={ids.receivedBy}
                users={users}
                value={users.find((u) => u.id === field.value) ?? null}
                onChange={(u) => field.onChange(u?.id ?? "")}
              />
            )}
          />
        </Field>
        <Field label={<>Log book <Important /></>} htmlFor={ids.logBook}>
          <Input
            id={ids.logBook}
            list={ids.logBookList}
            placeholder="AVAILABLE, NOT AVAILABLE…"
            {...form.register("logBook")}
          />
          <datalist id={ids.logBookList}>
            {LOG_BOOK_SUGGESTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Euro status" htmlFor={ids.euroStatus}>
          <Input id={ids.euroStatus} placeholder="e.g. EURO 6" {...form.register("euroStatus")} />
        </Field>
        <Field label="Engine size (kW)" htmlFor={ids.engineSizeKw} error={errors.engineSizeKw?.message}>
          <Input id={ids.engineSizeKw} type="number" min={0} {...form.register("engineSizeKw")} />
        </Field>
        <Field label="Number of seats" htmlFor={ids.numSeats} error={errors.numSeats?.message}>
          <Input id={ids.numSeats} type="number" min={0} {...form.register("numSeats")} />
        </Field>
        <Field label="Former keepers" htmlFor={ids.formerKeepers} error={errors.formerKeepers?.message}>
          <Input id={ids.formerKeepers} type="number" min={0} {...form.register("formerKeepers")} />
        </Field>
        <Field label={<>No. of keys <Important /></>} htmlFor={ids.numKeys} error={errors.numKeys?.message}>
          <Input id={ids.numKeys} type="number" min={0} {...form.register("numKeys")} />
        </Field>
        <Field label="Mass in service (kg)" htmlFor={ids.mass} error={errors.massInService?.message}>
          <Input id={ids.mass} type="number" min={0} {...form.register("massInService")} />
        </Field>
        <Field label="Chassis / frame no." htmlFor={ids.vin}>
          <Input id={ids.vin} className="font-mono uppercase" {...form.register("vin")} />
        </Field>
        <Field label="Engine no." htmlFor={ids.engineNumber}>
          <Input id={ids.engineNumber} className="font-mono uppercase" {...form.register("engineNumber")} />
        </Field>
        <Controller
          control={form.control}
          name="serviceHistory"
          render={({ field }) => (
            <Select
              id={ids.serviceHistory}
              label="Service history"
              options={[...SERVICE_HISTORY_OPTIONS]}
              value={field.value}
              onChange={(v) => field.onChange(v)}
            />
          )}
        />
        <div className="flex items-center sm:pt-6">
          <Controller
            control={form.control}
            name="lockNut"
            render={({ field }) => (
              <Checkbox
                id={ids.lockNut}
                label="Lock nut"
                checked={field.value}
                onChange={(checked) => field.onChange(checked)}
              />
            )}
          />
        </div>
        <Field label="Other items received" htmlFor={ids.otherItems} className="sm:col-span-2">
          <Input
            id={ids.otherItems}
            placeholder="SD card, nav disc, charging cables…"
            {...form.register("otherItemsReceived")}
          />
        </Field>
      </div>
    </Card>
  );
}

/**
 * Type-ahead employee search for "Received By" (GEN-81) — the team asked
 * for type-and-select rather than a long static dropdown. Only a selected
 * employee commits a value; typing without picking a result never sets one,
 * so the field can't silently hold free text as if it were a real employee.
 */
function EmployeeCombobox({
  users,
  value,
  onChange,
  id,
}: {
  users: User[];
  value: User | null;
  onChange: (user: User | null) => void;
  id?: string;
}) {
  return (
    <Combobox
      items={users}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(u: User) => u.name}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Search employees…"
        startAddon={<Search />}
        showClear={value !== null}
        className="w-full"
      />
      <ComboboxPopup>
        <ComboboxEmpty>No employee matches.</ComboboxEmpty>
        <ComboboxList>
          {(u: User) => <ComboboxItem key={u.id} value={u}>{u.name}</ComboboxItem>}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
