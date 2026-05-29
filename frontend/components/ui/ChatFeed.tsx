'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import HextechScrollbar from '@/components/ui/HextechScrollbar';

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
  /** Custom Hextech rail (hides native scrollbar). */
  scrollbar?: 'default' | 'hextech' | 'mafia';
};

export default function ChatFeed({
  items,
  emptyMessage,
  className,
  autoScroll = true,
  scrollbar = 'default',
}: ChatFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length, autoScroll]);

  const feedBody = (
    <>
      {items.length === 0 && emptyMessage != null && (
        <p className="text-xs text-hub-muted text-center py-8">{emptyMessage}</p>
      )}

      {items.map((item) => (
        <div key={item.id} className={item.className}>
          {item.content}
        </div>
      ))}
    </>
  );

  if (scrollbar === 'hextech' || scrollbar === 'mafia') {
    const rowClass =
      scrollbar === 'mafia' ? 'mafia-scroll-row' : 'hextech-scroll-row';
    const contentClass =
      scrollbar === 'mafia' ? 'mafia-scroll-content' : 'hextech-scroll-content';
    return (
      <div className={clsx(rowClass, 'flex-1 min-h-0', className)}>
        <div
          ref={listRef}
          className={clsx(
            contentClass,
            'flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-2',
          )}
        >
          {feedBody}
        </div>
        <HextechScrollbar
          scrollRef={listRef}
          contentKey={items.length}
          variant={scrollbar === 'mafia' ? 'mafia' : 'hextech'}
        />
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={clsx(
        'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 scrollbar-thin',
        className,
      )}
    >
      {feedBody}
    </div>
  );
}
