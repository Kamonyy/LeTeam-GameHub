import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID_KEY = 'leteam_player_id';
const DISPLAY_NAME_KEY = 'leteam_display_name';

function generatePlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidv4();
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return fromLocal;
  const fromSession = sessionStorage.getItem(key);
  if (fromSession) {
    localStorage.setItem(key, fromSession);
    sessionStorage.removeItem(key);
  }
  return fromSession;
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';

  let id = readStorage(PLAYER_ID_KEY);
  if (!id) {
    id = generatePlayerId();
    writeStorage(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (typeof window === 'undefined') return '';
  return readStorage(DISPLAY_NAME_KEY) || '';
}

export function hasDisplayName(): boolean {
  if (typeof window === 'undefined') return false;
  const name = readStorage(DISPLAY_NAME_KEY);
  return !!name && name.trim().length > 0;
}

export function setDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (!trimmed) return;
  writeStorage(DISPLAY_NAME_KEY, trimmed);
}
