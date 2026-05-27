'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { AlertTriangle, OctagonX, X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  icon?: 'warning' | 'cancel';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  icon = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const Icon = icon === 'cancel' ? OctagonX : AlertTriangle;
  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        disabled={loading}
        onClick={onCancel}
      />

      <div
        className={clsx(
          'relative w-full max-w-md animate-overlay-pop rounded-2xl border shadow-2xl',
          'bg-hub-surface/95 backdrop-blur-md',
          isDanger ? 'border-hub-danger/40 shadow-hub-danger/10' : 'border-hub-border shadow-black/40'
        )}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-hub-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div
            className={clsx(
              'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border',
              isDanger
                ? 'border-hub-danger/40 bg-hub-danger/15 text-hub-danger'
                : 'border-hub-accent/40 bg-hub-accent/15 text-hub-accent'
            )}
          >
            <Icon className="h-7 w-7" />
          </div>

          <h2
            id="confirm-dialog-title"
            className="text-xl font-bold text-white mb-2 tracking-tight"
          >
            {title}
          </h2>
          <p id="confirm-dialog-message" className="text-sm text-hub-muted leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1 py-2.5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isDanger
                ? 'bg-hub-danger text-white hover:bg-red-600 shadow-lg shadow-hub-danger/20'
                : 'btn-primary'
            )}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
