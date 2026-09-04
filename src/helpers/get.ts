/**
 * Reads a nested value by path, falling back when it is missing.
 *
 * Replaces lodash `get`, and keeps its one surprising rule: the fallback
 * applies only to `undefined`. A stored `null` is a real value and is returned
 * as-is, so callers relying on that distinction keep working.
 *
 * Bracket indexes are normalised into path segments, so `a[0].b` and `a.0.b`
 * resolve alike. Without that, a bracketed path would silently miss and return
 * the fallback instead of the value that is actually there.
 */
export function get<T>(source: unknown, path: string, fallback: T): T {
  const keys = path
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter((key) => key !== "");

  let current: unknown = source;

  for (const key of keys) {
    if (current === null || current === undefined) return fallback;
    current = (current as Record<string, unknown>)[key];
  }

  return current === undefined ? fallback : (current as T);
}
