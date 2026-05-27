/** Player session tokens — bind playerId to a secret stored client-side. */

import { SESSION_TOKEN_BYTES } from './validate.js';

/**
 * @param {Map<string, string>} store playerId -> sessionToken hex
 * @param {string} playerId
 * @param {string | undefined | null} sessionToken
 */
export function verifyPlayerSession(store, playerId, sessionToken) {
  const existing = store.get(playerId);

  if (!existing) {
    const token = generateSessionToken();
    store.set(playerId, token);
    return { ok: true, sessionToken: token };
  }

  if (!sessionToken) {
    return { error: 'Session token required' };
  }

  if (sessionToken !== existing) {
    return { error: 'Invalid session token' };
  }

  return { ok: true, sessionToken: existing };
}

export function generateSessionToken() {
  const bytes = new Uint8Array(SESSION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
