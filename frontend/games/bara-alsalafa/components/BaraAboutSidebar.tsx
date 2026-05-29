'use client';

import clsx from 'clsx';
import { BookOpen } from 'lucide-react';
import BaraHowToPlay from './BaraHowToPlay';

interface BaraAboutSidebarProps {
  className?: string;
}

/** Rules — waiting lobby (right column on desktop in RTL) */
export default function BaraAboutSidebar({ className }: BaraAboutSidebarProps) {
  return (
    <aside className={clsx('bara-lobby-aside', className)}>
      <div className="bara-lobby-aside__panel" dir="rtl">
        <div className="bara-lobby-aside__header">
          <span className="bara-lobby-aside__icon" aria-hidden>
            <BookOpen className="w-4 h-4" />
          </span>
          <div>
            <p className="bara-label text-[var(--bara-rose-bright)]">
              كيف تلعب
            </p>
            <p className="text-[10px] bara-muted mt-0.5">برا السالفة · 3–12 لاعبين</p>
          </div>
        </div>
        <div className="bara-divider-rose my-4" />
        <BaraHowToPlay />
      </div>
    </aside>
  );
}
