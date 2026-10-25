"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { DateTimeInput, isDateTimeType } from "./date-time-input";
import { forwardBoxClick, inputBoxClassName, inputControlClassName } from "./input-styles";
import { SuggestInput } from "./suggest-input";

type InputProps = Omit<
  InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  nativeInput?: boolean;
  /** Values to offer as you type, in a Genaro list (in place of a <datalist>). */
  suggestions?: readonly string[];
};

export function Input({
  className,
  size = "default",
  unstyled = false,
  nativeInput = false,
  style,
  suggestions,
  ...props
}: InputProps): React.ReactElement {
  // base-ui also accepts a function of its state; the box only takes classes.
  const boxClass = typeof className === "function" ? undefined : className;
  // Dates and times get Genaro's calendar and time list, never the
  // browser's own pickers.
  if (isDateTimeType(props.type)) {
    return (
      <DateTimeInput
        {...(props as React.ComponentProps<"input">)}
        type={props.type}
        className={boxClass}
        size={size}
        unstyled={unstyled}
        style={typeof style === "function" ? undefined : style}
      />
    );
  }

  const inputClassName = inputControlClassName(size, props.type);

  if (suggestions) {
    return (
      <span
        className={inputBoxClassName(boxClass, unstyled)}
        data-size={size}
        data-slot="input-control"
        onMouseDown={forwardBoxClick}
      >
        <SuggestInput
          {...(props as React.ComponentProps<"input">)}
          suggestions={suggestions}
          wrapperClassName="flex-1"
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={typeof style === "function" ? undefined : style}
        />
      </span>
    );
  }

  return (
    <span
      className={inputBoxClassName(boxClass, unstyled)}
      data-size={size}
      data-slot="input-control"
      onMouseDown={forwardBoxClick}
    >
      {nativeInput ? (
        <input
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={typeof style === "function" ? undefined : style}
          {...props}
        />
      ) : (
        <InputPrimitive
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={style}
          {...props}
        />
      )}
    </span>
  );
}
