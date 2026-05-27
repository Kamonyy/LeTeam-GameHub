'use client';

import { Layers } from 'lucide-react';

interface BoneyardProps {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}

export default function Boneyard({ count, canDraw, onDraw }: BoneyardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw || count === 0}
        className="group relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl
                   bg-hub-surface border border-hub-border hover:border-hub-accent/50
                   transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="relative">
          <Layers className="w-8 h-8 text-hub-muted group-hover:text-hub-accent transition-colors" />
          {count > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center
                             bg-hub-accent text-white text-[10px] font-bold rounded-full px-1">
              {count}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-hub-muted group-hover:text-gray-300">
          {count > 0 ? 'Draw' : 'Empty'}
        </span>
      </button>
    </div>
  );
}
