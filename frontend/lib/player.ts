import { v4 as uuidv4 } from 'uuid';
import {
  patchCoreSession,
  readCoreSession,
  writeCoreSession,
  type CoreSessionV1,
} from '@/lib/session/core-session';
import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';

function newPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidv4();
}

const MAX_DISPLAY_NAME = 32;

export { HUB_NAVIGATING_KEY };

function ensureSession(): CoreSessionV1 {
  const existing = readCoreSession();
  if (existing) return existing;
  const created = patchCoreSession({});
  return created;
}

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  return ensureSession().player.id;
}

export function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return readCoreSession()?.player.token ?? '';
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (!token || typeof token !== 'string') return;
  patchCoreSession({ player: { token } });
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  patchCoreSession({ player: { token: '' } });
}

export function getDisplayName(): string {
  if (typeof window === 'undefined') return '';
  return readCoreSession()?.player.name ?? '';
}

export function hasDisplayName(): boolean {
  if (typeof window === 'undefined') return false;
  const name = readCoreSession()?.player.name ?? '';
  return name.trim().length > 0;
}

export function setDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME);
  if (!trimmed) return;
  patchCoreSession({ player: { name: trimmed } });
}

/** New random player id written to storage (does not read existing id). */
export function createFreshPlayerId(): string {
  if (typeof window === 'undefined') return '';
  const id = newPlayerId();

  const session = readCoreSession();
  if (session) {
    patchCoreSession({ player: { id, token: '' } });
  } else {
    writeCoreSession({
      v: 1,
      player: { id, name: '', token: '' },
      prefs: { audioMuted: false, vol: 0.8, sketchMuted: false },
    });
  }
  return id;
}

/** Clear per-game local data; keep player id, session token, and display name. */
export function clearPlayerLocalGameDataKeepingIdentity(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('wordgame_notes_')) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  try {
    sessionStorage.removeItem(HUB_NAVIGATING_KEY);
  } catch {
    /* ignore */
  }
}
