'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { AlertTriangle, OctagonX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  icon?: 'warning' | 'cancel';
  /** Amber-tinted scrim when used inside Mafia (`overlayVariant="warm"`). */
  overlayVariant?: 'default' | 'warm';
  /** Extra classes for the portaled overlay (e.g. z-index above match-over). */
  overlayClassName?: string;
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
  overlayVariant = 'default',
  overlayClassName,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
  }, [open]);

  const Icon = icon === 'cancel' ? OctagonX : AlertTriangle;
  const isDanger = variant === 'danger';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !loading) onCancel();
      }}
    >
      <DialogContent
        showClose
        overlayVariant={overlayVariant}
        overlayClassName={clsx(
          overlayVariant === 'warm' && 'z-[210]',
          overlayClassName,
        )}
        className={clsx(
          'max-w-md rounded-2xl border p-0 shadow-2xl',
          'bg-stone-900/95 backdrop-blur-md border-stone-800',
          overlayVariant === 'warm' && 'z-[210]',
          isDanger && 'border-rose-700/40 shadow-rose-950/20'
        )}
        onPointerDownOutside={(e) => {
          if (loading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-8 pb-2 text-center">
          <div
            className={clsx(
              'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border',
              isDanger
                ? 'border-rose-700/40 bg-rose-950/30 text-rose-400'
                : 'border-amber-600/40 bg-amber-950/30 text-amber-400'
            )}
          >
            <Icon className="h-7 w-7" aria-hidden />
          </div>

          <DialogTitle className="text-xl font-bold text-stone-100 tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed max-w-sm mx-auto">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-3 px-6 pb-6 sm:justify-center">
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
                ? 'bg-rose-700 text-white hover:bg-rose-600 shadow-lg shadow-rose-950/30'
                : 'btn-primary'
            )}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
