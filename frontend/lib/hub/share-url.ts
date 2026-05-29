export function buildShareUrl(path: string, roomId: string): string {
  if (typeof window === 'undefined') return path;
  const origin = window.location.origin;
  const base = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${base}?room=${encodeURIComponent(roomId)}`;
}
