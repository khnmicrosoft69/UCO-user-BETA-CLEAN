// Runs the DB + file sync once, synchronously, before the dev server starts
// - so every `npm run dev` begins with a guaranteed-fresh MySQL mirror and
// uploads/ folder, rather than waiting on the background watcher's first
// poll cycle (which only fires if no watcher is already running).
//
// Deliberately never fails the predev chain: if Supabase is unreachable
// (the exact scenario the MySQL fallback exists for), this logs a warning
// and lets `npm run dev` start anyway on whatever MySQL already has.

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function main() {
  console.log('[startup-sync] Syncing latest data + files before starting...');

  const dbOk = await runScript('scripts/sync-to-mysql.mjs');
  if (!dbOk) {
    console.warn('[startup-sync] DB sync failed (Supabase unreachable?) - continuing with dev startup on existing MySQL data.');
  }

  const filesOk = await runScript('scripts/sync-files.mjs');
  if (!filesOk) {
    console.warn('[startup-sync] File sync failed - continuing with dev startup on existing local files.');
  }

  if (dbOk && filesOk) {
    console.log('[startup-sync] Up to date.');
  }
}

main();
