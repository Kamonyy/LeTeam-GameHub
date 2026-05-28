'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  isSketchDrawSfxMuted,
  toggleSketchDrawSfxMuted,
  unlockSketchDrawAudio,
} from '../lib/sketchDrawSound';

export default function SketchDrawMuteButton() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSketchDrawSfxMuted());
  }, []);

  return (
    <button
      type="button"
      className="sketch-mute-btn"
      aria-label={muted ? 'Unmute sketch sounds' : 'Mute sketch sounds'}
      title={muted ? 'Unmute' : 'Mute'}
      onClick={() => {
        unlockSketchDrawAudio();
        setMuted(toggleSketchDrawSfxMuted());
      }}
    >
      {muted ?
        <VolumeX className="w-4 h-4" />
      : <Volume2 className="w-4 h-4" />}
    </button>
  );
}
