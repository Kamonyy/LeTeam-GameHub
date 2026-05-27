'use client';

import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface MafiaToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export default function MafiaToggle({
  checked,
  onChange,
  children,
  disabled = false,
  id: idProp,
  className,
}: MafiaToggleProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <label
      htmlFor={id}
      className={clsx(
        'tc-mafia-toggle',
        checked && 'tc-mafia-toggle--checked',
        disabled && 'tc-mafia-toggle--disabled',
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="tc-mafia-toggle__native"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="tc-mafia-toggle__box" aria-hidden>
        {checked && <Check className="tc-mafia-toggle__icon" strokeWidth={3} />}
      </span>
      <span className="tc-mafia-toggle__label">{children}</span>
    </label>
  );
}
