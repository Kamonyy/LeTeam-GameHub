'use client';

import { useEffect, useRef } from 'react';

type CursorMode = 'default' | 'grab' | 'crosshair' | 'letter' | 'mask';

export default function HubCustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<CursorMode>('default');
  const visibleRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduced || coarse || !fineHover) return;

    const root = rootRef.current;
    if (!root) return;

    const hubRoot = document.querySelector('.hub-arcade');
    hubRoot?.classList.add('hub-arcade--custom-cursor');

    const applyModeClass = (mode: CursorMode) => {
      root.classList.toggle('hub-cursor--grab', mode === 'grab');
      root.classList.toggle('hub-cursor--crosshair', mode === 'crosshair');
      root.classList.toggle('hub-cursor--letter', mode === 'letter');
      root.classList.toggle('hub-cursor--mask', mode === 'mask');
      root.textContent = mode === 'letter' ? '?' : '';
    };

    const setVisible = (next: boolean) => {
      if (visibleRef.current === next) return;
      visibleRef.current = next;
      root.style.opacity = next ? '1' : '0';
    };

    const onMove = (e: MouseEvent) => {
      root.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      setVisible(true);

      const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const el = hit?.closest('[data-hub-cursor]') as HTMLElement | null;
      const next = (el?.dataset.hubCursor as CursorMode) || 'default';
      if (next !== modeRef.current) {
        modeRef.current = next;
        applyModeClass(next);
      }
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    applyModeClass('default');
    setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      hubRoot?.classList.remove('hub-arcade--custom-cursor');
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return (
    <div ref={rootRef} className="hub-cursor" style={{ opacity: 0 }} aria-hidden />
  );
}
