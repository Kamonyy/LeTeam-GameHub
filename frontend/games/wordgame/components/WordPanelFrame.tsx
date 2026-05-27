'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

interface WordPanelFrameProps {
  children: ReactNode;
  className?: string;
  embers?: boolean;
}

/** Crystal centerpiece panel with optional edge embers */
export default function WordPanelFrame({
  children,
  className,
  embers = true,
}: WordPanelFrameProps) {
  return (
    <div className={clsx('sw-panel', className)}>
      {embers && (
        <div className="sw-panel-embers" aria-hidden>
          {[12, 28, 45, 62, 78, 88].map((left, i) => (
            <span
              key={left}
              style={{
                left: `${left}%`,
                animationDelay: `${i * 0.55}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="sw-panel__inner">{children}</div>
    </div>
  );
}
