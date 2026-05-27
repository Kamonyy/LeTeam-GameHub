'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

const MAGNET_RADIUS = 20;

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function MagneticButton({
  href,
  children,
  className,
  variant = 'primary',
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const edge = Math.max(rect.width, rect.height) / 2 + MAGNET_RADIUS;

    if (dist < edge) {
      const pull = Math.min(1, (edge - dist) / MAGNET_RADIUS) * 0.35;
      setOffset({ x: dx * pull, y: dy * pull });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const onLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <Link
      ref={ref}
      href={href}
      data-hub-cursor="default"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-shadow duration-200',
        variant === 'primary' ?
          'px-6 py-3 bg-hub-accent hover:bg-hub-accent-dim text-white shadow-lg shadow-hub-accent/25'
        :	'px-6 py-3 border border-hub-border bg-hub-card/80 text-gray-100 hover:border-hub-accent/40',
        className
      )}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
      }}
    >
      {children}
    </Link>
  );
}
