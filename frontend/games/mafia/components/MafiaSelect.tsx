'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label
        htmlFor={id}
        className="font-cinzel text-[0.68rem] font-semibold uppercase tracking-widest text-amber-100 before:mr-1 before:text-[0.55rem] before:text-amber-500 before:content-['◆_']"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="border-amber-900/45 bg-stone-950/85 text-[color:var(--p1-ink)] shadow-[inset_0_1px_0_rgba(212,166,74,0.08)] focus:ring-amber-600"
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
