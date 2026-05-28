'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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
    <div
      className={cn(
        'flex items-center gap-2.5',
        disabled && 'opacity-50',
        className
      )}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
      />
      <Label
        htmlFor={id}
        className={cn(
          'cursor-pointer text-[0.9rem] font-normal normal-case tracking-normal text-[color:var(--p1-ink-soft)]',
          checked && 'text-[color:var(--p1-ink)]',
          disabled && 'cursor-not-allowed'
        )}
      >
        {children}
      </Label>
    </div>
  );
}
