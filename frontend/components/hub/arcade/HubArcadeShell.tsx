'use client';

import { memo, type RefObject } from 'react';
import HubArcadeBackdrop from './HubArcadeBackdrop';
import HubParticleCanvas from './HubParticleCanvas';
import HubCustomCursor from './HubCustomCursor';

type HubArcadeShellProps = {
  hubRootRef?: RefObject<HTMLElement | null>;
};

function HubArcadeShellInner({ hubRootRef }: HubArcadeShellProps) {
  return (
    <>
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
      <HubParticleCanvas />
      <HubCustomCursor hubRootRef={hubRootRef} />
    </>
  );
}

const HubArcadeShell = memo(HubArcadeShellInner);
export default HubArcadeShell;
