'use client';

import type { MafiaNarratorPlayerRow } from '../types';
import NarratorCompactRoster from './NarratorCompactRoster';

interface NarratorTeamRosterProps {
  players: MafiaNarratorPlayerRow[];
  playerName: (id: string) => string;
}

export default function NarratorTeamRoster(props: NarratorTeamRosterProps) {
  return <NarratorCompactRoster {...props} />;
}
