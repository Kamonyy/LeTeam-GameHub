export const ROOM_CODE_REGEX = /^[A-Z0-9]{8}$/;

export function normalizeRoomCode(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  return ROOM_CODE_REGEX.test(upper) ? upper : null;
}
