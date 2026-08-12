import { promises as fs } from 'fs';

const DATA_DIR = process.env.OBS_DATA_DIR || '/var/www/retro-stellar-console/data';

/**
 * Fetch with a disk-backed cache that survives process restarts.
 * Fresh within freshMs; on fetch failure (e.g. upstream rate limit),
 * falls back to the stale disk copy rather than erroring.
 */
const lastFail = new Map<string, number>();
const FAIL_COOLDOWN_MS = 10 * 60 * 1000;

export async function fetchWithDiskCache<T>(name: string, freshMs: number, fetcher: () => Promise<T>): Promise<T> {
  const file = `${DATA_DIR}/${name}.json`;
  let disk: { fetchedAt: number; data: T } | null = null;
  try {
    disk = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch { /* no disk copy yet */ }

  if (disk && Date.now() - disk.fetchedAt < freshMs) return disk.data;

  // back off after a failure so we don't keep feeding a rate limiter
  const failedAt = lastFail.get(name);
  if (failedAt && Date.now() - failedAt < FAIL_COOLDOWN_MS) {
    if (disk) return disk.data;
    throw new Error(`${name}: upstream cooling down`);
  }

  try {
    const data = await fetcher();
    lastFail.delete(name);
    await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(file, JSON.stringify({ fetchedAt: Date.now(), data })).catch(() => {});
    return data;
  } catch (e) {
    lastFail.set(name, Date.now());
    if (disk) return disk.data; // stale beats nothing
    throw e;
  }
}
