'use client';

import { useState, type FormEvent, type RefObject } from 'react';
import clsx from 'clsx';
import { Send } from 'lucide-react';

export const CHAT_MAX_MESSAGE_LENGTH = 200;

type ChatComposerProps = {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  submitLabel?: string;
  /** Controlled draft — when omitted, composer manages its own state. */
  value?: string;
  onChange?: (value: string) => void;
};

export default function ChatComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  maxLength = CHAT_MAX_MESSAGE_LENGTH,
  className,
  inputClassName,
  buttonClassName,
  inputRef,
  submitLabel = 'Send message',
  value: controlledValue,
  onChange,
}: ChatComposerProps) {
  const [internalDraft, setInternalDraft] = useState('');
  const draft = controlledValue ?? internalDraft;

  const setDraft = (next: string) => {
    const clipped = next.slice(0, maxLength);
    if (onChange) onChange(clipped);
    else setInternalDraft(clipped);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    await onSend(trimmed);
    setDraft('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'shrink-0 p-3 border-t border-hub-border flex gap-2',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={disabled ? 'Offline' : placeholder}
        className={clsx(
          'appearance-none flex-1 min-w-0 px-3 py-2 text-sm bg-hub-bg border border-hub-border rounded-lg',
          'text-foreground placeholder:text-hub-muted focus:outline-none focus:border-hub-accent',
          'normal-case tracking-normal text-left disabled:opacity-40',
          inputClassName,
        )}
        autoComplete="off"
        enterKeyHint="send"
      />
      <button
        type="submit"
        disabled={disabled || !draft.trim()}
        className={clsx(
          'btn-primary px-3 py-2 shrink-0 disabled:opacity-40',
          buttonClassName,
        )}
        aria-label={submitLabel}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
