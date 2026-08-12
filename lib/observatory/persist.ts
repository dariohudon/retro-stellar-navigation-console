import { promises as fs } from 'fs';

const DATA_DIR = process.env.OBS_DATA_DIR || '/var/www/retro-stellar-console/data';

/**
 * Fetch with a disk-backed cache that survives process restarts.
 * Fresh within freshMs; on fetch failure (e.g. upstream rate limit),
 * falls back to the stale disk copy rather than erroring.
 */
export async function fetchWithDiskCache<T>(name: string, freshMs: number, fetcher: () => Promise<T>): Promise<T> {
  const file = `${DATA_DIR}/${name}.json`;
  let disk: { fetchedAt: number; data: T } | null = null;
  try {
    disk = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch { /* no disk copy yet */ }

  if (disk && Date.now() - disk.fetchedAt < freshMs) return disk.data;

  try {
    const data = await fetcher();
    await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(file, JSON.stringify({ fetchedAt: Date.now(), data })).catch(() => {});
    return data;
  } catch (e) {
    if (disk) return disk.data; // stale beats nothing
    throw e;
  }
}
