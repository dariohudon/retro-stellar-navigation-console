interface Entry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

// Module-level store — persists across requests within the same Node.js process
const store = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): { data: T; ageSeconds: number } | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return {
    data: entry.data,
    ageSeconds: Math.floor((Date.now() - entry.createdAt) / 1000),
  };
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, {
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidate(key: string): void {
  store.delete(key);
}
