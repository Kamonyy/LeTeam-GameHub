/** Strip query/hash and trailing slashes for route comparison (trailingSlash-safe). */
export function normalizePathname(path: string): string {
  const raw =
    typeof window !== 'undefined' && path.startsWith('http') ?
      new URL(path).pathname
    : (path.split('?')[0]?.split('#')[0] ?? path);
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.replace(/\/+$/, '') || '/';
}

/** Match next.config `trailingSlash: true` for static export targets. */
export function ensureTrailingSlashPath(path: string): string {
  const normalized = normalizePathname(path);
  return normalized === '/' ? '/' : `${normalized}/`;
}
