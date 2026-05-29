'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

export type ChatFeedItem = {
  id: string;
  content: ReactNode;
  className?: string;
};

type ChatFeedProps = {
  items: ChatFeedItem[];
  emptyMessage?: ReactNode;
  className?: string;
  /** When false, skip auto-scroll on new items (e.g. user scrolled up). */
  autoScroll?: boolean;
};

export default function ChatFeed({
  items,
  emptyMessage,
  className,
  autoScroll = true,
}: ChatFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length, autoScroll]);

  return (
    <div
      ref={listRef}
      className={clsx(
        'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 scrollbar-thin',
        className,
      )}
    >
      {items.length === 0 && emptyMessage != null && (
        <p className="text-xs text-hub-muted text-center py-8">{emptyMessage}</p>
      )}

      {items.map((item) => (
        <div key={item.id} className={item.className}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
