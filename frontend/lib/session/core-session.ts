import { v4 as uuidv4 } from 'uuid';

export const CORE_SESSION_KEY = 'leteam_core_session';
const LEGACY_PLAYER_ID = 'leteam_player_id';
const LEGACY_DISPLAY_NAME = 'leteam_display_name';
const LEGACY_SESSION_TOKEN = 'leteam_session_token';
const LEGACY_LOL_MUTED = 'sw-lol-audio-muted';
const LEGACY_LOL_VOLUME = 'sw-lol-audio-volume';
const LEGACY_SKETCH_MUTED = 'sketch-draw-sfx-muted';

export const HUB_NAVIGATING_KEY = 'hub-navigating-game';

export interface CoreSessionV1 {
  v: 1;
  player: {
    id: string;
    name: string;
    token: string;
  };
  prefs: {
    audioMuted: boolean;
    vol: number;
    sketchMuted: boolean;
  };
}

const DEFAULT_PREFS: CoreSessionV1['prefs'] = {
  audioMuted: false,
  vol: 0.8,
  sketchMuted: false,
};

function generatePlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidv4();
}

function clampVol(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PREFS.vol;
  return Math.min(1, Math.max(0, n));
}

function parseSession(raw: string): CoreSessionV1 | null {
  try {
    const data = JSON.parse(raw) as Partial<CoreSessionV1>;
    if (data?.v !== 1 || !data.player || typeof data.player.id !== 'string') {
      return null;
    }
    return {
      v: 1,
      player: {
        id: data.player.id,
        name: typeof data.player.name === 'string' ? data.player.name : '',
        token: typeof data.player.token === 'string' ? data.player.token : '',
      },
      prefs: {
        audioMuted: !!data.prefs?.audioMuted,
        vol: clampVol(Number(data.prefs?.vol ?? DEFAULT_PREFS.vol)),
        sketchMuted: !!data.prefs?.sketchMuted,
      },
    };
  } catch {
    return null;
  }
}

function readLegacyString(key: string): string | null {
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

function migrateLegacySession(): CoreSessionV1 | null {
  if (typeof window === 'undefined') return null;

  let id = readLegacyString(LEGACY_PLAYER_ID);
  const name = readLegacyString(LEGACY_DISPLAY_NAME) ?? '';
  const token = readLegacyString(LEGACY_SESSION_TOKEN) ?? '';
  const lolMuted = localStorage.getItem(LEGACY_LOL_MUTED) === '1';
  const hadLolVol = localStorage.getItem(LEGACY_LOL_VOLUME) != null;
  const sketchMuted = localStorage.getItem(LEGACY_SKETCH_MUTED) === '1';

  const hadLegacy =
    !!id || !!name.trim() || !!token || lolMuted || hadLolVol || sketchMuted;
  if (!hadLegacy) return null;

  if (!id) {
    id = generatePlayerId();
  }
  let vol = DEFAULT_PREFS.vol;
  const rawVol = localStorage.getItem(LEGACY_LOL_VOLUME);
  if (rawVol != null) {
    const parsed = Number(rawVol);
    if (Number.isFinite(parsed)) vol = clampVol(parsed);
  }
  const session: CoreSessionV1 = {
    v: 1,
    player: { id, name, token },
    prefs: { audioMuted: lolMuted, vol, sketchMuted },
  };

  writeCoreSession(session);

  localStorage.removeItem(LEGACY_PLAYER_ID);
  localStorage.removeItem(LEGACY_DISPLAY_NAME);
  localStorage.removeItem(LEGACY_SESSION_TOKEN);
  sessionStorage.removeItem(LEGACY_PLAYER_ID);
  localStorage.removeItem(LEGACY_LOL_MUTED);
  localStorage.removeItem(LEGACY_LOL_VOLUME);
  localStorage.removeItem(LEGACY_SKETCH_MUTED);

  return session;
}

export function readCoreSession(): CoreSessionV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CORE_SESSION_KEY);
    if (raw) {
      const parsed = parseSession(raw);
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return migrateLegacySession();
}

export function writeCoreSession(session: CoreSessionV1): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CORE_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* quota / private mode */
  }
}

export function patchCoreSession(
  patch: Partial<{
    player: Partial<CoreSessionV1['player']>;
    prefs: Partial<CoreSessionV1['prefs']>;
  }>
): CoreSessionV1 {
  const current =
    readCoreSession() ?? {
      v: 1 as const,
      player: { id: generatePlayerId(), name: '', token: '' },
      prefs: { ...DEFAULT_PREFS },
    };

  const next: CoreSessionV1 = {
    v: 1,
    player: { ...current.player, ...patch.player },
    prefs: { ...current.prefs, ...patch.prefs },
  };
  writeCoreSession(next);
  return next;
}

/** One-shot client bootstrap: load core session + hub navigation hint. */
export function initializeClientStorage(): {
  hubNavigatingGameId: string | null;
} {
  readCoreSession();
  let hubNavigatingGameId: string | null = null;
  if (typeof window === 'undefined') return { hubNavigatingGameId };

  try {
    hubNavigatingGameId = sessionStorage.getItem(HUB_NAVIGATING_KEY);
    if (hubNavigatingGameId) {
      sessionStorage.removeItem(HUB_NAVIGATING_KEY);
    }
  } catch {
    /* ignore */
  }

  return { hubNavigatingGameId };
}
