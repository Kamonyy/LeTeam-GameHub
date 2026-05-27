'use client';

import clsx from 'clsx';
import { BookOpen } from 'lucide-react';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import WordPanelFrame from './WordPanelFrame';

interface WordGameAboutSidebarProps {
  className?: string;
}

/** Rules & description — waiting lobby only (right column on desktop) */
export default function WordGameAboutSidebar({ className }: WordGameAboutSidebarProps) {
  return (
    <aside className={clsx('sw-lobby-aside', className)}>
      <WordPanelFrame className="sw-lobby-aside__panel p-5 sm:p-6" embers={false}>
        <div className="sw-lobby-aside__header">
          <span className="sw-lobby-aside__icon" aria-hidden>
            <BookOpen className="w-4 h-4" />
          </span>
          <div>
            <p className="sw-heading text-[10px] tracking-[0.2em]">How to Play</p>
            <p className="text-[10px] sw-muted mt-0.5 normal-case tracking-normal">
              Secret Word · 2 players
            </p>
          </div>
        </div>
        <div className="sw-divider-gold sw-divider-gold--draw my-4 opacity-70" />
        <GameAboutPanel gameId="wordgame" variant="wordgame" />
      </WordPanelFrame>
    </aside>
  );
}
