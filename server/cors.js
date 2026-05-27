/** CORS helpers for local dev server only. */

export function parseAllowedOrigins(raw) {
  if (!raw) return ['http://localhost:3000'];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function createCorsOriginChecker(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
