const LOCAL_API = 'http://localhost:3001';

let cachedServerUrl: string | null = null;

/** Next dev (3000) + Node hub (3001); empty config.json must not mean same-origin here. */
function isSplitLocalDev(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'http:') return false;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  const port = window.location.port;
  return port === '3000' || port === '';
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

    return (
      parsed.origin === window.location.origin ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

/** Resolve Socket.io URL: config.json → same-origin HTTPS → env → localhost. */
export async function resolveServerUrl(): Promise<string> {
  if (cachedServerUrl) return cachedServerUrl;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { serverUrl?: string };
        if (data.serverUrl === '' || data.serverUrl === '/') {
          if (!isSplitLocalDev()) {
            cachedServerUrl = window.location.origin;
            return cachedServerUrl;
          }
          // fall through to env / LOCAL_API
        }
        if (data.serverUrl && isAllowedServerUrl(data.serverUrl)) {
          cachedServerUrl = data.serverUrl;
          return cachedServerUrl;
        }
      }
    } catch {
      // fall through
    }

    if (window.location.protocol === 'https:') {
      cachedServerUrl = window.location.origin;
      return cachedServerUrl;
    }
  }

  const fallback = process.env.NEXT_PUBLIC_SERVER_URL || LOCAL_API;
  if (typeof window !== 'undefined' && !isAllowedServerUrl(fallback)) {
    cachedServerUrl = window.location.origin;
    return cachedServerUrl;
  }

  cachedServerUrl = fallback;
  return cachedServerUrl;
}

export function isSameOriginServer(serverUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(serverUrl, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}
