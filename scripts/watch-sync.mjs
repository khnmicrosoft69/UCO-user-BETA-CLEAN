// Long-running watcher: polls Supabase for new/changed data and re-runs
// scripts/sync-to-mysql.mjs automatically when it detects any.
// Not meant to be run directly - scripts/spawn-watch-sync.mjs launches this
// detached in the background so `npm run dev` doesn't block on it.
//
// Detection strategy: every table's row COUNT(*) is summed into one number
// each poll. If that number changes since the last poll, something was
// inserted or deleted somewhere, so a full sync is triggered. This also
// reliably catches in-place UPDATEs (e.g. a submission's status changing)
// in practice, because every mutation in this app writes an audit row via
// logEvent() (transaction_logs) and often a submission_notifications row
// too - so a pure status change still shows up as a row-count change
// elsewhere at the same time.

import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const POLL_INTERVAL_MS = Number(process.env.WATCH_SYNC_INTERVAL_MS) || 20_000;
const LOCK_PATH = path.join(__dirname, '.watch-sync.lock');

const TABLES = [
  'admin_accounts',
  'login_attempts',
  'member_accounts',
  'submission_notifications',
  'submissions',
  'super_admin_accounts',
  'team_calendar_events',
  'transaction_logs',
  'user_accounts',
];

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const existingPid = parseInt(fs.readFileSync(LOCK_PATH, 'utf8').trim(), 10);
    if (existingPid && isAlive(existingPid)) {
      console.log(`[watch-sync] Already running (pid ${existingPid}) - exiting.`);
      process.exit(0);
    }
    console.log('[watch-sync] Found a stale lock file - taking over.');
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock() {
  try {
    const pid = parseInt(fs.readFileSync(LOCK_PATH, 'utf8').trim(), 10);
    if (pid === process.pid) fs.rmSync(LOCK_PATH, { force: true });
  } catch {
    // Nothing to clean up.
  }
}

process.on('exit', releaseLock);
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

acquireLock();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false });

async function getRowCountFingerprint() {
  const counts = await Promise.all(
    TABLES.map((table) => sql.unsafe(`SELECT COUNT(*)::int AS c FROM ${table}`)),
  );
  return counts.reduce((sum, rows) => sum + (rows[0]?.c ?? 0), 0);
}

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('exit', () => resolve());
    child.on('error', (err) => {
      console.error(`[watch-sync] Failed to launch ${scriptPath}:`, err.message);
      resolve();
    });
  });
}

async function runSync() {
  // Row data first, then the actual file bytes any new/changed submissions
  // reference - keeps both the MySQL mirror and the local uploads/ folder
  // current whenever new data shows up.
  await runScript('scripts/sync-to-mysql.mjs');
  await runScript('scripts/sync-files.mjs');
}

async function main() {
  console.log(`[watch-sync] Started (pid ${process.pid}), checking every ${POLL_INTERVAL_MS / 1000}s.`);

  let lastCount = null;

  while (true) {
    try {
      const count = await getRowCountFingerprint();

      if (lastCount === null) {
        console.log(`[watch-sync] Baseline row count: ${count}. Running initial sync...`);
        await runSync();
        lastCount = count;
      } else if (count !== lastCount) {
        console.log(`[watch-sync] Row count changed (${lastCount} -> ${count}) - syncing...`);
        await runSync();
        lastCount = count;
      }
    } catch (err) {
      console.error('[watch-sync] Check failed (will retry next interval):', err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
