const LOCAL_API = 'http://localhost:3001';

let cachedServerUrl: string | null = null;

/** Resolve Socket.io URL: config.json → same-origin HTTPS → env → localhost. */
export async function resolveServerUrl(): Promise<string> {
  if (cachedServerUrl) return cachedServerUrl;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { serverUrl?: string };
        if (data.serverUrl === '' || data.serverUrl === '/') {
          cachedServerUrl = window.location.origin;
          return cachedServerUrl;
        }
        if (data.serverUrl) {
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

  cachedServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || LOCAL_API;
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
