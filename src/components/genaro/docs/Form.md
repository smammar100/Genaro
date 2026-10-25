# Form fields

`FormTextField`, `FormSelect`, `FormCombobox`, `FormCheckbox` and `FormSwitch`: Genaro fields wired to a react-hook-form field. Each one passes the value, change, blur and focus through, and shows the field's validation message as its error.

```tsx
import { FormCheckbox, FormCombobox, FormSelect, FormSwitch, FormTextField } from '@/components/genaro';
```

## Use it for
- Every field in a form built with react-hook-form's `useForm`. Give each one `control` and `name`, plus the field's own props (`label`, `options`, `helpText`…). The form owns the value, so there's no `value` or `defaultValue`, and the error comes from validation, so there's no `error`.
- With a schema (`zodResolver`), the messages come from the schema. Without one, put them in `rules`: `rules={{ required: 'Enter the customer’s name' }}`. Messages say what to do: "Enter a UK mobile number, like 07712 345678".
- `onChange` still works and runs after the form has the value: use it for side effects, such as copying a picked vehicle into "Vehicle interest".
- On a failed submit the form focuses the first invalid field. `mode: 'onBlur'` and `'onTouched'` work too: the fields report a blur when focus leaves the whole field.
- Values: `FormTextField`, `FormSelect` and `FormCombobox` hold strings (`''` when empty) and `FormCombobox allowMultiple` a `string[]`; `FormCheckbox` and `FormSwitch` hold booleans. Keep numbers as strings in the form and convert on submit, as the Add vehicle form does, or use `z.coerce.number()` in the schema.
- `FormSwitch` in a form that saves with a button saves with the rest of the form; it doesn't apply on its own.
- No `Form`, `FormField`, `FormItem`, `FormLabel` or `FormMessage` scaffolding: the label, help text and error belong to the Genaro field.

## Migrating a `register()` field

Before, with shadcn's `Input`:

```tsx
<div>
  <Label htmlFor={firstNameId}>First name</Label>
  <Input
    id={firstNameId}
    {...form.register('firstName')}
    aria-invalid={!!errors.firstName}
    className={cn(errors.firstName && 'border-destructive')}
  />
  {errors.firstName?.message && <p className="mt-1 text-caption text-destructive">{errors.firstName.message}</p>}
</div>
```

After:

```tsx
<FormTextField control={form.control} name="firstName" label="First name" />
```

- Drop the field's `useId`: the bridge makes one. Pass `id` only when something else points at the field.
- `register('x', { required: 'Message' })` becomes `rules={{ required: 'Message' }}`. `valueAsNumber`, `valueAsDate` and `setValueAs` have no equivalent: convert in the schema or on submit.
- `<Input type="number">` becomes `type="number"` (with a stepper) or `inputMode="numeric"`; `<Textarea>` becomes `multiline`; a hand-drawn asterisk becomes `requiredIndicator`.
- `<Controller render={({ field }) => <Select … />} />` becomes `<FormSelect … />`.
- A Combobox whose `onValueChange` calls `form.setValue('vehicleId', v?.id ?? '', { shouldValidate: true })`, with an `InlineError` under it, becomes `<FormCombobox name="vehicleId" … />`.
- A Switch or Checkbox driven by `form.watch('flag')` and `form.setValue('flag', v, { shouldDirty: true })` becomes `<FormSwitch name="flag" … />` or `<FormCheckbox name="flag" … />`.
- shadcn's `<Form {...form}>` is react-hook-form's `FormProvider`. Inside one, `control` is optional; swap it for `<FormProvider {...form}>` when the last shadcn field goes.

## Examples

A lead form validated by a zod schema (Client Component; `saveLead` is a Server Action):

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  customerName: z.string().trim().min(1, 'Enter the customer’s name'),
  mobile: z.string().trim().regex(/^07\d{3} ?\d{6}$/, 'Enter a UK mobile number, like 07712 345678'),
  channel: z.string().min(1, 'Choose where the lead came from'),
  vehicleId: z.string(),
  financeInterest: z.boolean(),
});
type Lead = z.infer<typeof schema>;

const form = useForm<Lead>({
  resolver: zodResolver(schema),
  defaultValues: { customerName: '', mobile: '', channel: '', vehicleId: '', financeInterest: false },
});

<form onSubmit={form.handleSubmit(saveLead)} noValidate>
  <Card title="New lead">
    <FormTextField control={form.control} name="customerName" label="Customer name" autoComplete="name" />
    <FormTextField control={form.control} name="mobile" label="Mobile" type="tel" autoComplete="tel" />
    <FormSelect control={form.control} name="channel" label="Lead channel" placeholder="Choose a channel" options={channels} />
    <FormCombobox
      control={form.control}
      name="vehicleId"
      label="Vehicle of interest"
      prefix="SearchMinor"
      clearable
      options={vehicleOptions}
    />
    <FormSwitch
      control={form.control}
      name="financeInterest"
      label="Interested in finance"
      helpText="Adds the lead to the finance team’s follow-up queue."
      labelPosition="start"
    />
  </Card>
  <ButtonGroup>
    <Button variant="primary" submit loading={form.formState.isSubmitting}>
      Save lead
    </Button>
  </ButtonGroup>
</form>
```

Rules without a schema:

```tsx
<FormTextField
  control={form.control}
  name="email"
  label="Email"
  type="email"
  autoComplete="email"
  rules={{ pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter an email address like name@example.com' } }}
/>
```

A side effect after the form has the value:

```tsx
<FormCombobox
  control={form.control}
  name="vehicleId"
  label="Vehicle"
  options={vehicleOptions}
  clearable
  onChange={(id) => {
    const v = vehicles.find((x) => x.id === id);
    if (v) form.setValue('vehicleInterest', `${v.make} ${v.model} (${v.registration})`);
  }}
/>
```

## Props

Every form field takes these, plus its Genaro field's props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `control` | `Control` | from `FormProvider` | `form.control` from `useForm()`. |
| `name` | `FieldPath` | — | Required. The field's path, such as `"customerName"` or `"address.postcode"`. Also the field's `name`. |
| `rules` | `RegisterOptions` | — | `required`, `pattern`, `min`, `validate`… with messages. Not needed with a schema resolver. |
| `defaultValue` | the field's value | — | When `useForm`'s `defaultValues` doesn't set one. |
| `shouldUnregister` | `boolean` | — | Drops the value when the field unmounts. |

| Component | Wraps | Leaves out | Value |
|---|---|---|---|
| `FormTextField` | `TextField` | `value`, `defaultValue`, `error` | `string` |
| `FormSelect` | `Select` | `value`, `defaultValue`, `error` | `string` |
| `FormCombobox` | `Combobox` | `value`, `defaultValue`, `error` | `string`, or `string[]` with `allowMultiple` |
| `FormCheckbox` | `Checkbox` | `checked`, `defaultChecked`, `error` | `boolean` |
| `FormSwitch` | `Switch` | `checked`, `defaultChecked`, `error` | `boolean` |

`onChange` keeps its field's signature and runs after the form updates. `disabled` disables the field; a form-wide `useForm({ disabled: true })` disables every field too.

## Server Components
Client components: they use react-hook-form's hooks, so render them from the Client Component that calls `useForm`. For a form that posts straight to a Server Action without react-hook-form, use the plain fields with `name` and `defaultValue`.

## Accessibility
- Each field keeps its own label, help text, `aria-invalid`, and `aria-describedby` pointing at the error message.
- On a failed submit, focus moves to the first invalid field (react-hook-form's `shouldFocusError`).
- Give the `<form>` `noValidate`, so the browser's own bubbles don't compete with the inline errors.
