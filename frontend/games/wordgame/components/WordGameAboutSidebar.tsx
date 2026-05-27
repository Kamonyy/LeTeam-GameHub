'use client';

import clsx from 'clsx';
import { BookOpen } from 'lucide-react';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import WordPanelFrame from './WordPanelFrame';

interface WordGameAboutSidebarProps {
  className?: string;
}

/** Game rules & description — pinned on the right during lobby and play */
export default function WordGameAboutSidebar({ className }: WordGameAboutSidebarProps) {
  return (
    <aside className={clsx('w-full lg:max-w-[300px] lg:justify-self-end', className)}>
      <WordPanelFrame className="p-4 sm:p-5 lg:sticky lg:top-24" embers={false}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#f0d78c]" aria-hidden />
          <span className="sw-heading text-[10px]">How to Play</span>
        </div>
        <div className="sw-divider-gold mb-4 opacity-60" />
        <GameAboutPanel gameId="wordgame" variant="wordgame" />
      </WordPanelFrame>
    </aside>
  );
}
