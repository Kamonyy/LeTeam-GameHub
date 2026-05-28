/** Origin allowlist for production socket traffic. */

export const ALLOWED_ORIGINS = new Set([
  'https://gamehub.mohamed-hussein.net',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

/**
 * @param {Request} req
 */
export function isAllowedSocketRequest(req) {
  const origin = req.headers.get('Origin');
  if (origin) {
    return ALLOWED_ORIGINS.has(origin);
  }

  // Production requires Origin; do not trust Host alone (CSRF / origin confusion).
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const host = req.headers.get('Host') || '';
  if (host === 'gamehub.mohamed-hussein.net') return true;
  if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) return true;

  return false;
}
