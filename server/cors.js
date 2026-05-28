/** CORS helpers for local dev server only. */

export function parseAllowedOrigins(raw) {
  if (!raw) return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function isLanCorsEnabled() {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_LAN_CORS === 'true'
  );
}

/** Allow phone/tablet access via http://192.168.x.x:3000 during local dev. */
function isPrivateNetworkDevOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:') return false;
    const port = u.port || (u.protocol === 'http:' ? '80' : '443');
    if (port !== '3000') return false;

    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    return false;
  } catch {
    return false;
  }
}

export function createCorsOriginChecker(allowedOrigins) {
  const hadWildcard = allowedOrigins.includes('*');
  const origins = allowedOrigins.filter((o) => o !== '*');
  if (hadWildcard) {
    console.warn(
      'CORS: CLIENT_URL wildcard (*) is ignored when credentials are enabled'
    );
  }

  const allowMissingOrigin = process.env.NODE_ENV === 'development';
  const allowLanBypass = isLanCorsEnabled();

  return (origin, callback) => {
    if (!origin) {
      callback(null, allowMissingOrigin);
      return;
    }
    if (origins.includes(origin)) {
      callback(null, true);
      return;
    }
    if (allowLanBypass && isPrivateNetworkDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
