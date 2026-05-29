'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import clsx from 'clsx';
import './hextech-scrollbar.css';

const MIN_THUMB_PX = 28;

type ScrollMetrics = {
  overflows: boolean;
  thumbHeight: number;
  thumbTop: number;
};

export type HextechScrollbarProps = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Bumps layout when scroll content changes. */
  contentKey?: string | number;
  className?: string;
};

export default function HextechScrollbar({
  scrollRef,
  contentKey,
  className,
}: HextechScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    overflows: false,
    thumbHeight: MIN_THUMB_PX,
    thumbTop: 0,
  });
  const dragRef = useRef<{
    startY: number;
    startScrollTop: number;
    pointerId: number;
  } | null>(null);

  const updateMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollHeight, clientHeight, scrollTop } = el;
    const overflows = scrollHeight > clientHeight + 1;

    if (!overflows) {
      setMetrics((m) =>
        m.overflows ? { overflows: false, thumbHeight: MIN_THUMB_PX, thumbTop: 0 } : m,
      );
      return;
    }

    const trackHeight = trackRef.current?.clientHeight ?? clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_PX,
      Math.round((clientHeight / scrollHeight) * trackHeight),
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = scrollHeight - clientHeight;
    const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    setMetrics({ overflows: true, thumbHeight, thumbTop });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const schedule = () => {
      updateMetrics();
      requestAnimationFrame(updateMetrics);
    };

    schedule();
    el.addEventListener('scroll', updateMetrics, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(el);
    if (el.parentElement) resizeObserver.observe(el.parentElement);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      el.removeEventListener('scroll', updateMetrics);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [scrollRef, updateMetrics, contentKey]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => updateMetrics());
    ro.observe(track);
    return () => ro.disconnect();
  }, [updateMetrics]);

  const scrollByThumbPosition = useCallback(
    (clientY: number) => {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const rect = track.getBoundingClientRect();
      const trackHeight = track.clientHeight;
      const thumbHeight = Math.max(
        MIN_THUMB_PX,
        Math.round((el.clientHeight / el.scrollHeight) * trackHeight),
      );
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const localY = clientY - rect.top - thumbHeight / 2;
      const ratio =
        maxThumbTop > 0 ? Math.min(1, Math.max(0, localY / maxThumbTop)) : 0;
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = ratio * maxScroll;
    },
    [scrollRef],
  );

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragRef.current = {
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el || !track) return;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_PX,
      Math.round((el.clientHeight / el.scrollHeight) * trackHeight),
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxThumbTop <= 0 || maxScroll <= 0) return;

    const deltaY = e.clientY - drag.startY;
    const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
    el.scrollTop = drag.startScrollTop + scrollDelta;
  };

  const endThumbDrag = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target !== trackRef.current) return;
    scrollByThumbPosition(e.clientY);
  };

  return (
    <div
      className={clsx(
        'hextech-scroll-bar',
        !metrics.overflows && 'hextech-scroll-bar--idle',
        className,
      )}
      aria-hidden
    >
      <div
        ref={trackRef}
        className="hextech-scroll-bar__track"
        onPointerDown={onTrackPointerDown}
      >
        {metrics.overflows && (
          <div
            className={clsx(
              'hextech-scroll-bar__thumb',
              isDragging && 'hextech-scroll-bar__thumb--dragging',
            )}
            style={{
              height: metrics.thumbHeight,
              transform: `translateY(${metrics.thumbTop}px)`,
            }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={endThumbDrag}
            onPointerCancel={endThumbDrag}
          />
        )}
      </div>
    </div>
  );
}
