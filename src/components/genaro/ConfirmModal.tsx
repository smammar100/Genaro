'use client';

import * as React from 'react';
import { Modal } from './Modal';

/** What `confirm()` asks, and what ConfirmModal shows. */
export interface ConfirmOptions {
  /** The question, in sentence case: "Delete lead?", "Mark invoice INV-1042 as paid?". Also the dialog's accessible name. */
  title: string;
  /** What will happen, and whether it can be undone: "Priya Shah’s lead and her 2 appointments will be deleted. This can’t be undone." */
  description?: React.ReactNode;
  /** The confirm button: a verb + noun that answers the title ("Delete lead"). Defaults to "Confirm". */
  confirmText?: string;
  /** The button that backs out. Defaults to "Cancel". */
  cancelText?: string;
  /** Makes the confirm button primary critical, for actions that delete or can’t be undone. */
  destructive?: boolean;
}

export interface ConfirmModalProps extends ConfirmOptions {
  /** Shows the dialog. */
  open: boolean;
  /** Called by the confirm button. */
  onConfirm: () => void;
  /** Called by the cancel button, the close button, Escape and a backdrop click. */
  onCancel: () => void;
  /** Shows a spinner on the confirm button while the action runs; the dialog can’t be dismissed until it finishes. */
  loading?: boolean;
}

/**
 * A small dialog that asks one yes-or-no question before an action happens, such as deleting a lead.
 * Built on Modal: the title asks, the description says what will change, and the primary button
 * answers with a verb + noun (critical when `destructive`). For a promise-based `confirm()`, use
 * `useConfirm`; when the confirmation needs a field, such as a reason, use Modal.
 * @import import { ConfirmModal } from "@/components/genaro";
 */
export function ConfirmModal({
  open, title, description, confirmText, cancelText, destructive, loading, onConfirm, onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="small"
      primaryAction={{ content: confirmText || 'Confirm', destructive, loading, onAction: onConfirm }}
      secondaryActions={[{ content: cancelText || 'Cancel', onAction: loading ? undefined : onCancel }]}
    >
      {description}
    </Modal>
  );
}

export interface UseConfirm {
  /** Opens the dialog; resolves `true` on confirm and `false` on cancel, Escape or a backdrop click. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** The dialog: render it once, anywhere in the component. */
  confirmDialog: React.ReactElement;
}

/**
 * A promise-based `window.confirm` that shows a ConfirmModal:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete job?", confirmText: "Delete job", destructive: true }))) return;
 *   return <>{page}{confirmDialog}</>;
 *
 * Dismissing the dialog resolves `false`, like `window.confirm`. A second `confirm()` before the first is
 * answered resolves the first `false`, and so does unmounting.
 * @import import { useConfirm } from "@/components/genaro";
 */
export function useConfirm(): UseConfirm {
  const [state, setState] = React.useState<ConfirmOptions & { open: boolean }>({ open: false, title: '' });
  const resolver = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = React.useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  React.useEffect(
    () => () => {
      resolver.current?.(false);
    },
    [],
  );

  const confirmDialog = <ConfirmModal {...state} onConfirm={() => settle(true)} onCancel={() => settle(false)} />;
  return { confirm, confirmDialog };
}
