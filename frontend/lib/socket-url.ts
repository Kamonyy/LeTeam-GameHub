const LOCAL_API = 'http://localhost:3001';
const DEV_HUB_PORT = '3001';

let cachedServerUrl: string | null = null;
let cachedForHostname: string | null = null;

/** Next dev (3000) + Node hub (3001) on the same machine / LAN. */
function isLocalFrontendDev(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'http:') return false;
  const port = window.location.port;
  return port === '3000' || port === '';
}

/** Hub URL for split dev: same host as the page, port 3001 (works on LAN IPs). */
function getDevHubServerUrl(): string {
  if (typeof window === 'undefined') return LOCAL_API;
  return `http://${window.location.hostname}:${DEV_HUB_PORT}`;
}

function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function isAllowedServerUrl(url: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return false;
    }

    if (window.location.protocol === 'https:') {
      return parsed.origin === window.location.origin;
    }

    if (parsed.origin === window.location.origin) return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    // Split dev: frontend :3000, hub :3001 on the same host (e.g. 192.168.x.x).
    if (
      isLocalFrontendDev() &&
      parsed.protocol === 'http:' &&
      parsed.port === DEV_HUB_PORT &&
      parsed.hostname === window.location.hostname &&
      isPrivateLanHostname(parsed.hostname)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Resolve Socket.io URL: config.json → same-origin HTTPS → LAN dev hub → env. */
export async function resolveServerUrl(): Promise<string> {
  const pageHostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  if (cachedServerUrl && cachedForHostname === pageHostname) {
    return cachedServerUrl;
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { serverUrl?: string };
        if (data.serverUrl === '' || data.serverUrl === '/') {
          if (isLocalFrontendDev()) {
            return rememberServerUrl(getDevHubServerUrl(), pageHostname);
          }
          return rememberServerUrl(window.location.origin, pageHostname);
        }
        if (data.serverUrl && isAllowedServerUrl(data.serverUrl)) {
          return rememberServerUrl(data.serverUrl, pageHostname);
        }
      }
    } catch {
      // fall through
    }

    if (window.location.protocol === 'https:') {
      return rememberServerUrl(window.location.origin, pageHostname);
    }

    if (isLocalFrontendDev()) {
      return rememberServerUrl(getDevHubServerUrl(), pageHostname);
    }
  }

  const fallback = process.env.NEXT_PUBLIC_SERVER_URL || LOCAL_API;
  if (typeof window !== 'undefined' && !isAllowedServerUrl(fallback)) {
    return rememberServerUrl(window.location.origin, pageHostname);
  }

  return rememberServerUrl(fallback, pageHostname);
}

function rememberServerUrl(url: string, hostname: string): string {
  cachedServerUrl = url;
  cachedForHostname = hostname;
  return url;
}

export function isSameOriginServer(serverUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(serverUrl, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}
