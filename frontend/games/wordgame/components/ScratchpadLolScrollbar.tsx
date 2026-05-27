'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

const MIN_THUMB_PX = 28;

type ScrollMetrics = {
  overflows: boolean;
  thumbHeight: number;
  thumbTop: number;
};

interface ScratchpadLolScrollbarProps {
  scrollRef: React.RefObject<HTMLUListElement | null>;
  /** Bumps layout when note list changes (scrollHeight not always observed). */
  contentKey?: string | number;
  isLol?: boolean;
}

export default function ScratchpadLolScrollbar({
  scrollRef,
  contentKey,
  isLol = true,
}: ScratchpadLolScrollbarProps) {
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
    const list = scrollRef.current;
    if (!list) return;

    const { scrollHeight, clientHeight, scrollTop } = list;
    const overflows = scrollHeight > clientHeight + 1;

    if (!overflows) {
      setMetrics((m) =>
        m.overflows ? { overflows: false, thumbHeight: MIN_THUMB_PX, thumbTop: 0 } : m
      );
      return;
    }

    const trackHeight = trackRef.current?.clientHeight ?? clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_PX,
      Math.round((clientHeight / scrollHeight) * trackHeight)
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = scrollHeight - clientHeight;
    const thumbTop =
      maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    setMetrics({ overflows: true, thumbHeight, thumbTop });
  }, [scrollRef]);

  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const schedule = () => {
      updateMetrics();
      requestAnimationFrame(updateMetrics);
    };

    schedule();
    list.addEventListener('scroll', updateMetrics, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(list);
    if (list.parentElement) resizeObserver.observe(list.parentElement);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(list, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      list.removeEventListener('scroll', updateMetrics);
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
      const list = scrollRef.current;
      const track = trackRef.current;
      if (!list || !track) return;

      const rect = track.getBoundingClientRect();
      const trackHeight = track.clientHeight;
      const thumbHeight = Math.max(
        MIN_THUMB_PX,
        Math.round((list.clientHeight / list.scrollHeight) * trackHeight)
      );
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const localY = clientY - rect.top - thumbHeight / 2;
      const ratio =
        maxThumbTop > 0 ? Math.min(1, Math.max(0, localY / maxThumbTop)) : 0;
      const maxScroll = list.scrollHeight - list.clientHeight;
      list.scrollTop = ratio * maxScroll;
    },
    [scrollRef]
  );

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const list = scrollRef.current;
    if (!list) return;
    setIsDragging(true);
    dragRef.current = {
      startY: e.clientY,
      startScrollTop: list.scrollTop,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const list = scrollRef.current;
    const track = trackRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !list || !track) return;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_PX,
      Math.round((list.clientHeight / list.scrollHeight) * trackHeight)
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = list.scrollHeight - list.clientHeight;
    if (maxThumbTop <= 0 || maxScroll <= 0) return;

    const deltaY = e.clientY - drag.startY;
    const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
    list.scrollTop = drag.startScrollTop + scrollDelta;
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
        'sw-scratchpad-lol-bar',
        isLol && 'sw-scratchpad-lol-bar--lol',
        !metrics.overflows && 'sw-scratchpad-lol-bar--idle'
      )}
      aria-hidden
    >
      <div
        ref={trackRef}
        className="sw-scratchpad-lol-bar__track"
        onPointerDown={onTrackPointerDown}
      >
        {metrics.overflows && (
          <div
            className={clsx(
              'sw-scratchpad-lol-bar__thumb',
              isDragging && 'sw-scratchpad-lol-bar__thumb--dragging'
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
