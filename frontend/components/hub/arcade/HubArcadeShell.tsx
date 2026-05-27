'use client';

import { memo } from 'react';
import HubArcadeBackdrop from './HubArcadeBackdrop';
import HubParticleCanvas from './HubParticleCanvas';
import HubCustomCursor from './HubCustomCursor';

function HubArcadeShellInner() {
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
      <HubCustomCursor />
    </>
  );
}

const HubArcadeShell = memo(HubArcadeShellInner);
export default HubArcadeShell;
