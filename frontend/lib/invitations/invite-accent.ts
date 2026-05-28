export interface InviteAccent {
  color: string;
  borderClass: string;
  progressClass: string;
}

const ACCENT_MAP: Record<string, InviteAccent> = {
  dominoes: {
    color: '#10b981',
    borderClass: 'border-l-[#10b981]',
    progressClass: 'bg-[#10b981]',
  },
  wordgame: {
    color: '#06b6d4',
    borderClass: 'border-l-[#06b6d4]',
    progressClass: 'bg-[#06b6d4]',
  },
  'sketch-draw': {
    color: '#06b6d4',
    borderClass: 'border-l-[#06b6d4]',
    progressClass: 'bg-[#06b6d4]',
  },
  mafia: {
    color: '#ef4444',
    borderClass: 'border-l-[#ef4444]',
    progressClass: 'bg-[#ef4444]',
  },
  'bara-alsalafa': {
    color: '#ef4444',
    borderClass: 'border-l-[#ef4444]',
    progressClass: 'bg-[#ef4444]',
  },
};

const DEFAULT_ACCENT: InviteAccent = {
  color: '#3b82f6',
  borderClass: 'border-l-[#3b82f6]',
  progressClass: 'bg-[#3b82f6]',
};

export function getInviteAccent(gameType: string): InviteAccent {
  return ACCENT_MAP[gameType] ?? DEFAULT_ACCENT;
}
