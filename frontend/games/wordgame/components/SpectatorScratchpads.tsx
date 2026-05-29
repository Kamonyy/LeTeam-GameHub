'use client';

import Scratchpad from './Scratchpad';
import type { ScratchpadNote } from '../hooks/useScratchpadNotes';

interface SpectatorScratchpadsProps {
  playerIds: string[];
  playerNames: Record<string, string>;
  scratchpadsByPlayer: Record<string, ScratchpadNote[]>;
  isLol?: boolean;
}

export default function SpectatorScratchpads({
  playerIds,
  playerNames,
  scratchpadsByPlayer,
  isLol = false,
}: SpectatorScratchpadsProps) {
  return (
    <div className="sw-spectator-scratchpads">
      <p className="text-[10px] uppercase tracking-widest sw-muted mb-3 px-0.5">
        Player clue scratchpads
      </p>
      <div className="sw-spectator-scratchpads__grid">
        {playerIds.map((id) => (
          <Scratchpad
            key={id}
            readOnly
            isLol={isLol}
            title={playerNames[id] || 'Player'}
            notes={scratchpadsByPlayer[id] ?? []}
            emptyHint="No clues logged yet."
          />
        ))}
      </div>
    </div>
  );
}
