'use client';

import type { ReactNode } from 'react';
import HubArcadeBackdrop from './HubArcadeBackdrop';

/** Shared arcade lounge backdrop for full-screen loading states. */
export default function HubArcadeLoadingEnvironment({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="hub-arcade min-h-dvh relative overflow-x-hidden">
      <HubArcadeBackdrop />
      <div className="hub-aura hub-aura--emerald" aria-hidden />
      <div className="hub-aura hub-aura--indigo" aria-hidden />
      <div
        className="hub-aura pointer-events-none fixed rounded-full blur-[140px] z-0"
        style={{
          width: 'min(40vw, 400px)',
          height: 'min(40vw, 400px)',
          left: '35%',
          bottom: '8%',
          background: 'rgba(168, 85, 247, 0.14)',
          animation: 'hub-aura-breathe 6s ease-in-out infinite 1.5s',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
