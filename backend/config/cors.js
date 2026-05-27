/**
 * CORS origin resolver for production.
 *
 * CLIENT_URL — comma-separated allowed origins, e.g.:
 *   https://your-project.pages.dev,https://yourdomain.com
 *
 * Automatically allows Cloudflare Pages preview/production URLs (*.pages.dev).
 */

/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseAllowedOrigins(raw) {
  if (!raw) return ['http://localhost:3000'];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** @param {string} origin */
export function isPagesDevOrigin(origin) {
  return /^https:\/\/[\w-]+(\.[\w-]+)*\.pages\.dev$/.test(origin);
}

/**
 * @param {string[]} allowedOrigins
 * @returns {(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void}
 */
export function createCorsOriginChecker(allowedOrigins) {
  return (origin, callback) => {
    // Same-origin or non-browser clients (no Origin header)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }

    if (isPagesDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
