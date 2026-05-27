'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type CursorMode = 'default' | 'grab' | 'crosshair' | 'letter';

export default function HubCustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [mode, setMode] = useState<CursorMode>('default');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);

      const target = e.target as HTMLElement | null;
      const el = target?.closest('[data-hub-cursor]') as HTMLElement | null;
      const next = (el?.dataset.hubCursor as CursorMode) || 'default';
      setMode(next);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={clsx(
        'hub-cursor',
        mode === 'grab' && 'hub-cursor--grab',
        mode === 'crosshair' && 'hub-cursor--crosshair',
        mode === 'letter' && 'hub-cursor--letter'
      )}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      aria-hidden
    >
      {mode === 'letter' && '?'}
    </div>
  );
}
