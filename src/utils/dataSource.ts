// OFFLINE-MODE FEATURE
// Decides whether a request should be served from Supabase (Postgres) or the
// local MySQL/MariaDB fallback. Delete this file (and src/utils/mysqlDb.ts,
// and every "OFFLINE-MODE FEATURE" block elsewhere) to remove the feature.

import sql from './db';

export type DbMode = 'supabase' | 'mysql';

const PROBE_TIMEOUT_MS = 4000; // cold Supabase pooler connections can take ~2s
const CACHE_MS = 30_000;

let cachedMode: DbMode | null = null;
let cachedAt = 0;
// Dedupes concurrent callers into a single in-flight probe, so a page that
// fires several API requests at once (sidebar badges, /api/me, etc.) right
// after the cache expires doesn't each independently pay the multi-second
// detection cost in parallel.
let inFlightProbe: Promise<DbMode> | null = null;

async function probeSupabase(): Promise<boolean> {
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function detectMode(): Promise<DbMode> {
  const now = Date.now();
  if (cachedMode && now - cachedAt < CACHE_MS) return cachedMode;
  if (inFlightProbe) return inFlightProbe;

  inFlightProbe = (async () => {
    const reachable = await probeSupabase();
    cachedMode = reachable ? 'supabase' : 'mysql';
    cachedAt = Date.now();
    inFlightProbe = null;
    return cachedMode;
  })();

  return inFlightProbe;
}

// Warm the cache the moment this module loads (i.e. on server startup),
// instead of waiting for the first real request to pay the detection cost.
// By the time an actual user hits the site, the mode is almost always
// already known - this is what was making the very first page after a
// cold start feel like it hung/went blank for a few seconds.
detectMode().catch(() => {});

interface CookieGetter {
  get(name: string): { value: string } | undefined;
}

/**
 * Resolves which database to use for this request.
 * A `db_mode` cookie set to 'supabase' or 'mysql' forces that mode.
 * Otherwise, mode is auto-detected by probing Supabase reachability
 * (cached for a few seconds to avoid probing on every request).
 */
export async function getActiveMode(cookies?: CookieGetter): Promise<DbMode> {
  const override = cookies?.get('db_mode')?.value;
  if (override === 'supabase' || override === 'mysql') return override;
  return detectMode();
}
