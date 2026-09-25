import * as React from 'react';
import { Icon } from './Icon';

export interface InlineErrorProps {
  /** Say what happened and how to fix it: "Enter a valid email address". */
  message: React.ReactNode;
  id?: string;
}

/** Validation message under a form field (text-critical with AlertMinor). */
export function InlineError({ message, id }: InlineErrorProps) {
  return (
    <div className="p-inline-error" id={id}>
      <Icon source="AlertMinor" />
      <span>{message}</span>
    </div>
  );
}
