const MAX_PATH_LENGTH = 120;
const PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*$/;

export function normalizeWorkspacePath(raw: string): string | null {
  const path = raw.trim().replace(/^\/+/, '');
  if (!path || path.length > MAX_PATH_LENGTH) return null;
  const segments = path.split('/');
  if (!segments.every((segment) => PATH_SEGMENT.test(segment))) return null;
  return segments.join('/');
}
