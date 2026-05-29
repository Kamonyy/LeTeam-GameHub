'use client';

import type { WordCategory, WordGameGuesserAssignment } from '../types';
import RevealCard from './RevealCard';
import WordPanelFrame from './WordPanelFrame';

interface SpectatorAssignmentsProps {
  playerIds: string[];
  playerNames: Record<string, string>;
  assignmentsForGuesser: Record<string, WordGameGuesserAssignment>;
  wordCategory: WordCategory;
}

export default function SpectatorAssignments({
  playerIds,
  playerNames,
  assignmentsForGuesser,
  wordCategory,
}: SpectatorAssignmentsProps) {
  const entries = playerIds
    .map((guesserId) => {
      const assignment = assignmentsForGuesser[guesserId];
      if (!assignment?.word) return null;
      const assignerId = assignment.assignedByPlayerId;
      const assignerName =
        assignerId ? playerNames[assignerId] || 'Player' : 'Opponent';
      const guesserName = playerNames[guesserId] || 'Player';
      const isLol = wordCategory === 'lol-champions';
      return {
        guesserId,
        assignment,
        caption:
          isLol ?
            `${assignerName} picked for ${guesserName}`
          :	`${assignerName} inscribed for ${guesserName}`,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e != null);

  if (entries.length === 0) return null;

  return (
    <WordPanelFrame className="p-4 sm:p-5 sw-accent-ember" embers={false} panelEnter={false}>
      <p className="text-[10px] uppercase tracking-widest sw-muted mb-3">
        Round assignments
      </p>
      <div className="sw-spectator-assignments__grid">
        {entries.map(({ guesserId, assignment, caption }) => (
          <RevealCard
            key={guesserId}
            wordCategory={wordCategory}
            word={assignment.word}
            championId={assignment.championId}
            ownerPlayerId={assignment.assignedByPlayerId ?? guesserId}
            viewerPlayerId={playerIds[0]}
            playerIds={playerIds}
            caption={caption}
            layout="side"
            compact
          />
        ))}
      </div>
    </WordPanelFrame>
  );
}
