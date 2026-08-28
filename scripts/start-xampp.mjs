// OFFLINE-MODE FEATURE
// Runs before `npm run dev` (via the "predev" script) to make sure XAMPP's
// MySQL and Apache are up, so the local MySQL fallback is available.
// Delete this file and the "predev" line in package.json to remove it.
//
// Safe to keep even if XAMPP isn't installed: every step is best-effort and
// only logs a warning on failure - it never blocks `npm run dev` from starting.

import { spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

const XAMPP_ROOT = process.env.XAMPP_PATH || 'C:\\xampp';
const READY_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 300;

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

async function waitForPort(port, label) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    if (await isPortOpen(port)) {
      console.log(`[start-xampp] ${label} is up (port ${port}).`);
      return true;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.warn(`[start-xampp] ${label} didn't come up on port ${port} within ${READY_TIMEOUT_MS}ms.`);
  return false;
}

function spawnDetached(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

async function ensureService({ label, port, exe, args, cwd }) {
  if (await isPortOpen(port)) {
    console.log(`[start-xampp] ${label} already running.`);
    return;
  }

  if (!fs.existsSync(exe)) {
    console.warn(`[start-xampp] ${label} not found at ${exe} - skipping (is XAMPP_PATH correct?).`);
    return;
  }

  console.log(`[start-xampp] Starting ${label}...`);
  try {
    spawnDetached(exe, args, cwd);
  } catch (err) {
    console.warn(`[start-xampp] Failed to start ${label}:`, err.message);
    return;
  }

  await waitForPort(port, label);
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[start-xampp] Not on Windows - skipping XAMPP autostart.');
    return;
  }

  if (!fs.existsSync(XAMPP_ROOT)) {
    console.warn(`[start-xampp] XAMPP not found at ${XAMPP_ROOT} - skipping. Set XAMPP_PATH env var if it's installed elsewhere.`);
    return;
  }

  await ensureService({
    label: 'MySQL',
    port: 3306,
    exe: path.join(XAMPP_ROOT, 'mysql', 'bin', 'mysqld.exe'),
    args: ['--defaults-file=' + path.join(XAMPP_ROOT, 'mysql', 'bin', 'my.ini'), '--standalone'],
    cwd: path.join(XAMPP_ROOT, 'mysql', 'bin'),
  });

  await ensureService({
    label: 'Apache',
    port: 80,
    exe: path.join(XAMPP_ROOT, 'apache', 'bin', 'httpd.exe'),
    args: [],
    cwd: path.join(XAMPP_ROOT, 'apache'),
  });
}

main().catch((err) => {
  console.warn('[start-xampp] Unexpected error (continuing anyway):', err.message);
});
