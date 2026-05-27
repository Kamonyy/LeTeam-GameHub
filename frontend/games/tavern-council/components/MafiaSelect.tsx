'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface MafiaSelectOption {
  value: string;
  label: string;
}

interface MafiaSelectProps {
  label: string;
  value: string;
  options: MafiaSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export default function MafiaSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  id: idProp,
  className,
}: MafiaSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const selected = options.find((o) => o.value === value);

  return (
    <div className={clsx('tc-mafia-select-field', className)}>
      <label htmlFor={id} className="tc-mafia-select-field__label">
        {label}
      </label>
      <div className={clsx('tc-mafia-select', disabled && 'tc-mafia-select--disabled')}>
        <span className="tc-mafia-select__value" aria-hidden>
          {selected?.label ?? '—'}
        </span>
        <ChevronDown className="tc-mafia-select__chevron" aria-hidden />
        <select
          id={id}
          className="tc-mafia-select__native"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
