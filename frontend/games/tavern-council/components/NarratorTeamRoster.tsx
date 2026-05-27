'use client';

import type { TavernNarratorPlayerRow } from '../types';
import NarratorCompactRoster from './NarratorCompactRoster';

interface NarratorTeamRosterProps {
  players: TavernNarratorPlayerRow[];
  playerName: (id: string) => string;
}

export default function NarratorTeamRoster(props: NarratorTeamRosterProps) {
  return <NarratorCompactRoster {...props} />;
}
