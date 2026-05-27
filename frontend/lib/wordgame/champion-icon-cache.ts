import { championIconSrc, LOL_DDRAGON_VERSION } from './lol-champions';

const CACHE_PREFIX = 'leteam-lol-champion-icons';
const loaded = new Set<string>();
const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(id: string, version: string) {
  return `${version}:${id}`;
}

function cacheBucket(version: string) {
  return `${CACHE_PREFIX}-${version}`;
}

function isCacheApiAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

async function readFromCacheApi(
  cdnUrl: string,
  version: string
): Promise<Blob | null> {
  if (!isCacheApiAvailable()) return null;
  try {
    const cache = await caches.open(cacheBucket(version));
    const res = await cache.match(cdnUrl);
    if (!res?.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

async function writeToCacheApi(
  cdnUrl: string,
  version: string,
  response: Response
): Promise<void> {
  if (!isCacheApiAvailable() || !response.ok) return;
  try {
    const cache = await caches.open(cacheBucket(version));
    await cache.put(cdnUrl, response.clone());
  } catch {
    /* ignore quota / private mode */
  }
}

function rememberBlob(key: string, blob: Blob): string {
  const existing = objectUrls.get(key);
  if (existing) {
    loaded.add(key);
    return existing;
  }
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  loaded.add(key);
  return url;
}

/**
 * Resolve a champion icon URL: in-memory → Cache API → CDN fetch (then cache).
 */
export async function resolveChampionIconUrl(
  id: string,
  version = LOL_DDRAGON_VERSION
): Promise<string> {
  const key = cacheKey(id, version);
  const mem = objectUrls.get(key);
  if (mem) return mem;

  const pending = inflight.get(key);
  if (pending) return pending;

  const cdnUrl = championIconSrc(id, version);

  const promise = (async () => {
    const cachedBlob = await readFromCacheApi(cdnUrl, version);
    if (cachedBlob) {
      return rememberBlob(key, cachedBlob);
    }

    const res = await fetch(cdnUrl, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      inflight.delete(key);
      return cdnUrl;
    }

    await writeToCacheApi(cdnUrl, version, res);
    const blob = await res.blob();
    return rememberBlob(key, blob);
  })()
    .catch(() => cdnUrl)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Synchronous URL only when already resolved this session. */
export function getResolvedChampionIconUrlSync(
  id: string,
  version = LOL_DDRAGON_VERSION
): string | null {
  return objectUrls.get(cacheKey(id, version)) ?? null;
}

/** Warm cache for one champion portrait (idempotent). */
export function preloadChampionIcon(
  id: string,
  version = LOL_DDRAGON_VERSION
): Promise<void> {
  return resolveChampionIconUrl(id, version).then(() => undefined);
}

/** Preload many icons in small batches to avoid flooding the network. */
export async function preloadChampionIcons(
  ids: string[],
  options?: { version?: string; batchSize?: number }
): Promise<void> {
  const version = options?.version ?? LOL_DDRAGON_VERSION;
  const batchSize = options?.batchSize ?? 16;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await Promise.all(batch.map((id) => preloadChampionIcon(id, version)));
  }
}

export function isChampionIconCached(
  id: string,
  version = LOL_DDRAGON_VERSION
): boolean {
  return loaded.has(cacheKey(id, version));
}
