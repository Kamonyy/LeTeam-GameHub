/** CORS helpers for local dev server only. */

export function parseAllowedOrigins(raw) {
  if (!raw) return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function createCorsOriginChecker(allowedOrigins) {
  const allowAny = allowedOrigins.includes('*');

  return (origin, callback) => {
    if (allowAny) {
      callback(null, true);
      return;
    }
    if (!origin) {
      callback(new Error('Origin header required'));
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
