'use client';

import * as React from 'react';
import {
  useController,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from 'react-hook-form';
import { Checkbox, type CheckboxProps } from './Checkbox';
import { Combobox, type ComboboxMultipleProps, type ComboboxSingleProps } from './Combobox';
import { Select, type SelectProps } from './Select';
import { Switch, type SwitchProps } from './Switch';
import { TextField, type TextFieldProps } from './TextField';

/** What every form field takes from react-hook-form. */
export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> {
  /** `form.control` from `useForm()`. Optional inside a `<FormProvider>`, which supplies it. */
  control?: UseControllerProps<TFieldValues, TName, TTransformedValues>['control'];
  /** The field's path in the form values, such as `"customerName"` or `"address.postcode"`. Also its `name`. */
  name: TName;
  /**
   * Validation for this field when the form has no schema resolver: `required`, `pattern`, `validate`… Each
   * rule's message shows under the field.
   */
  rules?: UseControllerProps<TFieldValues, TName, TTransformedValues>['rules'];
  /** Starting value, when `useForm`'s `defaultValues` doesn't set one. */
  defaultValue?: UseControllerProps<TFieldValues, TName, TTransformedValues>['defaultValue'];
  /** Drops the value from the form when the field unmounts. */
  shouldUnregister?: boolean;
}

/** The field's error message, or `true` when a rule failed without one. */
const errorOf = (state: ControllerFieldState) => (state.error ? state.error.message || true : undefined);

/**
 * Tells the form the field was touched when focus leaves the whole field (not when it moves between its own
 * parts, such as a clear button), and gives the form a handle to focus it on a failed submit. It lays out as
 * if it weren't there.
 */
function FieldShell({ id, field, children }: { id: string; field: ControllerRenderProps<FieldValues, string>; children: React.ReactNode }) {
  const { ref, onBlur } = field;
  const register = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const control = () => document.getElementById(id) as HTMLInputElement | null;
      ref({ focus: () => control()?.focus(), select: () => control()?.select?.() });
    },
    [ref, id],
  );
  return (
    <div
      ref={register}
      className="p-form-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur();
      }}
    >
      {children}
    </div>
  );
}

/** Connects a field to the form and gives it a stable id. */
function useFormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>, TTransformedValues>(
  props: FormFieldProps<TFieldValues, TName, TTransformedValues> & { id?: string },
) {
  const { control, name, rules, defaultValue, shouldUnregister } = props;
  const { field, fieldState } = useController<TFieldValues, TName, TTransformedValues>({ control, name, rules, defaultValue, shouldUnregister });
  const autoId = React.useId();
  return { field: field as unknown as ControllerRenderProps<FieldValues, string>, error: errorOf(fieldState), id: props.id || autoId };
}

const text = (value: unknown) => (value == null ? '' : String(value));

export interface FormTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> extends FormFieldProps<TFieldValues, TName, TTransformedValues>,
    Omit<TextFieldProps, 'name' | 'value' | 'defaultValue' | 'error' | 'onChange'> {
  /** Runs after the form has the new value, for side effects such as filling in another field. */
  onChange?: (value: string, id: string) => void;
}

/**
 * A TextField wired to a react-hook-form field: value, change, blur and focus, with the field's validation
 * message as its error. Replaces `register()` + `<Input>` + a hand-written error line.
 * @import import { FormTextField } from "@/components/genaro";
 */
export function FormTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormTextFieldProps<TFieldValues, TName, TTransformedValues>) {
  const { control: _control, name: _name, rules: _rules, defaultValue: _defaultValue, shouldUnregister: _unregister, onChange, ...rest } = props;
  const { field, error, id } = useFormField(props);
  return (
    <FieldShell id={id} field={field}>
      <TextField
        {...rest}
        id={id}
        name={field.name}
        value={text(field.value)}
        disabled={rest.disabled || field.disabled}
        error={error}
        onChange={(value, fieldId) => {
          field.onChange(value);
          onChange?.(value, fieldId);
        }}
        onClearButtonClick={(fieldId) => {
          field.onChange('');
          rest.onClearButtonClick?.(fieldId);
        }}
      />
    </FieldShell>
  );
}

export interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> extends FormFieldProps<TFieldValues, TName, TTransformedValues>,
    Omit<SelectProps, 'name' | 'value' | 'defaultValue' | 'error' | 'onChange'> {
  /** Runs after the form has the new value, for side effects such as resetting a dependent field. */
  onChange?: (value: string, id: string) => void;
}

/**
 * A Select wired to a react-hook-form field. Give it a `placeholder` and start the value as `''` when there's
 * no sensible default, so "nothing chosen" can fail a `required` rule.
 * @import import { FormSelect } from "@/components/genaro";
 */
export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormSelectProps<TFieldValues, TName, TTransformedValues>) {
  const { control: _control, name: _name, rules: _rules, defaultValue: _defaultValue, shouldUnregister: _unregister, onChange, ...rest } = props;
  const { field, error, id } = useFormField(props);
  return (
    <FieldShell id={id} field={field}>
      <Select
        {...rest}
        id={id}
        name={field.name}
        value={text(field.value)}
        disabled={rest.disabled || field.disabled}
        error={error}
        onChange={(value, fieldId) => {
          field.onChange(value);
          onChange?.(value, fieldId);
        }}
      />
    </FieldShell>
  );
}

export interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> extends FormFieldProps<TFieldValues, TName, TTransformedValues>,
    Omit<CheckboxProps, 'name' | 'checked' | 'defaultChecked' | 'error' | 'onChange'> {
  /** Runs after the form has the new value. */
  onChange?: (checked: boolean, id: string) => void;
}

/**
 * A Checkbox wired to a boolean react-hook-form field.
 * @import import { FormCheckbox } from "@/components/genaro";
 */
export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormCheckboxProps<TFieldValues, TName, TTransformedValues>) {
  const { control: _control, name: _name, rules: _rules, defaultValue: _defaultValue, shouldUnregister: _unregister, onChange, ...rest } = props;
  const { field, error, id } = useFormField(props);
  return (
    <FieldShell id={id} field={field}>
      <Checkbox
        {...rest}
        id={id}
        name={field.name}
        checked={!!field.value}
        disabled={rest.disabled || field.disabled}
        error={error}
        onChange={(checked, fieldId) => {
          field.onChange(checked);
          onChange?.(checked, fieldId);
        }}
      />
    </FieldShell>
  );
}

export interface FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> extends FormFieldProps<TFieldValues, TName, TTransformedValues>,
    Omit<SwitchProps, 'name' | 'checked' | 'defaultChecked' | 'error' | 'onChange'> {
  /** Runs after the form has the new value. */
  onChange?: (checked: boolean, id: string) => void;
}

/**
 * A Switch wired to a boolean react-hook-form field. In a form that saves with a button, the switch's
 * value saves with the rest; it doesn't apply on its own.
 * @import import { FormSwitch } from "@/components/genaro";
 */
export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormSwitchProps<TFieldValues, TName, TTransformedValues>) {
  const { control: _control, name: _name, rules: _rules, defaultValue: _defaultValue, shouldUnregister: _unregister, onChange, ...rest } = props;
  const { field, error, id } = useFormField(props);
  return (
    <FieldShell id={id} field={field}>
      <Switch
        {...rest}
        id={id}
        name={field.name}
        checked={!!field.value}
        disabled={rest.disabled || field.disabled}
        error={error}
        onChange={(checked, fieldId) => {
          field.onChange(checked);
          onChange?.(checked, fieldId);
        }}
      />
    </FieldShell>
  );
}

type ComboboxFieldOmit = 'name' | 'value' | 'defaultValue' | 'error';

export type FormComboboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = FormFieldProps<TFieldValues, TName, TTransformedValues> &
  (Omit<ComboboxSingleProps, ComboboxFieldOmit> | Omit<ComboboxMultipleProps, ComboboxFieldOmit>);

/**
 * A Combobox wired to a react-hook-form field: a string (`''` for none), or a string array with
 * `allowMultiple`. `onChange` runs after the form has the new value.
 * @import import { FormCombobox } from "@/components/genaro";
 */
export function FormCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormComboboxProps<TFieldValues, TName, TTransformedValues>) {
  const {
    control: _control, name: _name, rules: _rules, defaultValue: _defaultValue, shouldUnregister: _unregister,
    allowMultiple: _allowMultiple, onChange: _onChange, ...rest
  } = props;
  const { field, error, id } = useFormField(props);
  const shared = { ...rest, id, name: field.name, error, disabled: rest.disabled || field.disabled };
  return (
    <FieldShell id={id} field={field}>
      {props.allowMultiple === true ? (
        <Combobox
          {...shared}
          allowMultiple
          value={Array.isArray(field.value) ? field.value.map(String) : []}
          onChange={(value, fieldId) => {
            field.onChange(value);
            props.onChange?.(value, fieldId);
          }}
        />
      ) : (
        <Combobox
          {...shared}
          value={text(field.value)}
          onChange={(value, fieldId) => {
            field.onChange(value);
            props.onChange?.(value, fieldId);
          }}
        />
      )}
    </FieldShell>
  );
}
