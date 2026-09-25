'use client';

import * as React from 'react';
import { InlineError } from './InlineError';
import { cx } from './utils';

export interface DropZoneProps {
  label?: string;
  onDrop?: (files: File[]) => void;
  /** e.g. "image/*". */
  accept?: string;
  allowMultiple?: boolean;
  actionTitle?: string;
  actionHint?: string;
  size?: 'small' | 'medium' | 'large';
  error?: string | boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/** Drag-and-drop or click-to-upload area for files and media. */
export function DropZone({ label, onDrop, accept, allowMultiple, actionTitle, actionHint, size, error, disabled, name, className }: DropZoneProps) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  function accepts(file: File) {
    if (!accept) return true;
    return accept
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean)
      .some((rule) => {
        if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
        if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
        return file.type.toLowerCase() === rule;
      });
  }
  return (
    <div className={cx('p-labelled', className)}>
      {label ? <span>{label}</span> : null}
      <label
        className={cx('p-dropzone', over && 'p-dropzone--over', !!error && 'p-dropzone--error', disabled && 'p-dropzone--disabled', `p-dropzone--${size || 'medium'}`)}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          let files = Array.from(e.dataTransfer.files).filter(accepts);
          if (allowMultiple === false) files = files.slice(0, 1);
          if (inputRef.current && typeof DataTransfer !== 'undefined') {
            const dt = new DataTransfer();
            files.forEach((f) => dt.items.add(f));
            inputRef.current.files = dt.files;
          }
          onDrop?.(files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="p-visually-hidden"
          name={name}
          multiple={allowMultiple !== false}
          accept={accept}
          disabled={disabled}
          onChange={(e) => onDrop?.(Array.from(e.target.files || []))}
        />
        <span className="p-dropzone__inner">
          <span className="p-btn p-btn--secondary p-btn--medium">
            <span className="p-btn__label">{actionTitle || 'Add files'}</span>
          </span>
          {actionHint ? <span className="p-dropzone__hint">{actionHint}</span> : null}
        </span>
      </label>
      {error && typeof error === 'string' ? <InlineError message={error} /> : null}
    </div>
  );
}
