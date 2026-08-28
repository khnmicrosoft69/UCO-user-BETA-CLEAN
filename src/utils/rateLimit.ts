/**
 * rateLimit.ts — Persistent (Postgres-backed) login throttle.
 *
 * Backed by the database rather than in-memory state so the limit is durable
 * and consistent no matter how many serverless instances are handling
 * requests.
 */
import sql from "./db";
import { mysqlQuery, mysqlExec } from "./mysqlDb"; // OFFLINE-MODE FEATURE
import type { DbMode } from "./dataSource"; // OFFLINE-MODE FEATURE

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 10;

let tableEnsured = false;
let mysqlTableEnsured = false; // OFFLINE-MODE FEATURE

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      ip_address TEXT NOT NULL,
      email TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS login_attempts_lookup_idx
      ON login_attempts (email, ip_address, created_at)
  `;
  tableEnsured = true;
}

// OFFLINE-MODE FEATURE START - delete this function to remove the MySQL fallback
async function ensureMysqlTable(): Promise<void> {
  if (mysqlTableEnsured) return;
  await mysqlExec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      ip_address VARCHAR(45) NOT NULL,
      email VARCHAR(255) NOT NULL,
      success TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY login_attempts_lookup_idx (email, ip_address, created_at)
    )
  `);
  mysqlTableEnsured = true;
}
// OFFLINE-MODE FEATURE END

/** Checks whether (ip, email) has hit the failed-attempt ceiling within the current window. */
export async function isLoginRateLimited(
  ip: string,
  email: string,
  mode: DbMode = 'supabase', // OFFLINE-MODE FEATURE
): Promise<{ limited: boolean; attempts: number }> {
  if (mode === 'mysql') {
    // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
    await ensureMysqlTable();
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const rows = await mysqlQuery<{ count: number }>(
      `SELECT COUNT(*) AS count FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 0 AND created_at > ?`,
      [email, ip, windowStart],
    );
    const attempts = Number(rows[0]?.count ?? 0);
    return { limited: attempts >= MAX_ATTEMPTS, attempts };
    // OFFLINE-MODE FEATURE END
  }

  await ensureTable();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM login_attempts
    WHERE email = ${email}
      AND ip_address = ${ip}
      AND success = FALSE
      AND created_at > ${windowStart}
  `;
  const attempts = (rows[0] as any)?.count ?? 0;
  return { limited: attempts >= MAX_ATTEMPTS, attempts };
}

/** Records a login attempt (success or failure) for rate-limit accounting. */
export async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean,
  mode: DbMode = 'supabase', // OFFLINE-MODE FEATURE
): Promise<void> {
  if (mode === 'mysql') {
    // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
    await ensureMysqlTable();
    await mysqlExec(`INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, ?)`, [ip, email, success]);
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await mysqlExec(`DELETE FROM login_attempts WHERE created_at < ?`, [cutoff]);
    }
    return;
    // OFFLINE-MODE FEATURE END
  }

  await ensureTable();
  await sql`
    INSERT INTO login_attempts (ip_address, email, success)
    VALUES (${ip}, ${email}, ${success})
  `;

  // Opportunistic cleanup so the table doesn't grow without bound — cheap
  // (indexed, small window) and only needs to run occasionally.
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await sql`DELETE FROM login_attempts WHERE created_at < ${cutoff}`;
  }
}

/** Clears throttle history for (ip, email) after a successful login. */
export async function clearLoginAttempts(
  ip: string,
  email: string,
  mode: DbMode = 'supabase', // OFFLINE-MODE FEATURE
): Promise<void> {
  if (mode === 'mysql') {
    // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
    await ensureMysqlTable();
    await mysqlExec(`DELETE FROM login_attempts WHERE ip_address = ? AND email = ?`, [ip, email]);
    return;
    // OFFLINE-MODE FEATURE END
  }

  await ensureTable();
  await sql`DELETE FROM login_attempts WHERE ip_address = ${ip} AND email = ${email}`;
}
