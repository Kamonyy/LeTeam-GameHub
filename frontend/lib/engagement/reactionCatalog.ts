export type RoomReactionId =
  | 'fire'
  | 'laugh'
  | 'skull'
  | 'clap'
  | 'heart'
  | 'think'
  | 'boom'
  | 'goat';

export type RoomReactionType = 'emoji' | 'sound';

export type RoomReactionCatalogEntry = {
  emoji: string;
  soundKey?: string;
  label: string;
};

export const ROOM_REACTION_CATALOG: Record<
  RoomReactionId,
  RoomReactionCatalogEntry
> = {
  fire: { emoji: '🔥', soundKey: 'fire', label: 'Fire' },
  laugh: { emoji: '😂', soundKey: 'laugh', label: 'Laugh' },
  skull: { emoji: '💀', soundKey: 'skull', label: 'Skull' },
  clap: { emoji: '👏', soundKey: 'clap', label: 'Clap' },
  heart: { emoji: '❤️', soundKey: 'heart', label: 'Heart' },
  think: { emoji: '🤔', soundKey: 'think', label: 'Think' },
  boom: { emoji: '💥', soundKey: 'boom', label: 'Boom' },
  goat: { emoji: '🐐', soundKey: 'goat', label: 'GOAT' },
};

export const ROOM_REACTION_IDS = Object.keys(
  ROOM_REACTION_CATALOG,
) as RoomReactionId[];

export function emojiForReactionId(reactionId: string): string | null {
  const entry = ROOM_REACTION_CATALOG[reactionId as RoomReactionId];
  return entry?.emoji ?? null;
}

export type RoomReactionBroadcast = {
  roomId: string;
  senderId: string;
  displayName: string;
  reactionId: string;
  type: RoomReactionType;
  timestamp: number;
};
