'use client';

import { useState } from 'react';
import { ChevronLeft, List } from 'lucide-react';
import clsx from 'clsx';

interface CheatSheetDrawerProps {
  categoryName: string;
  words: string[];
}

export default function CheatSheetDrawer({ categoryName, words }: CheatSheetDrawerProps) {
  const [open, setOpen] = useState(false);

  if (!words.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-30 btn-secondary py-2 px-3 text-xs flex items-center gap-2 shadow-lg"
        aria-expanded={open}
      >
        <List className="w-4 h-4" />
        قائمة مساعدة
      </button>

      <div
        className={clsx(
          'bara-drawer fixed top-0 left-0 h-full z-40 w-72 max-w-[85vw] transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        dir="rtl"
      >
        <div className="h-full bg-hub-card/95 border-r border-hub-border backdrop-blur-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">قائمة الكلمات المحتملة</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-hub-surface"
              aria-label="إغلاق"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-hub-muted mb-4">
            الفئة: <span className="text-hub-accent">{categoryName}</span>
          </p>
          <ul className="space-y-2 overflow-y-auto flex-1 text-sm">
            {words.map((w) => (
              <li
                key={w}
                className="px-3 py-2 rounded-lg bg-hub-surface/80 border border-hub-border/60"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}
    </>
  );
}
