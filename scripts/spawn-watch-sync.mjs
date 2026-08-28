// Launches scripts/watch-sync.mjs detached in the background so it keeps
// running for as long as the machine is up, without blocking `npm run dev`.
// Run automatically via the "predev" script.
//
// Output from the watcher goes to scripts/.watch-sync.log (not the dev
// server's console, since it's a detached background process) - tail that
// file to see what it's doing.

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, '.watch-sync.log');

const logFd = fs.openSync(logPath, 'a');

const child = spawn(process.execPath, [path.join(__dirname, 'watch-sync.mjs')], {
  cwd: path.join(__dirname, '..'),
  detached: true,
  stdio: ['ignore', logFd, logFd],
  windowsHide: true,
});
child.unref();

console.log(`[spawn-watch-sync] Launched background sync watcher (pid ${child.pid}). Logs: scripts/.watch-sync.log`);
