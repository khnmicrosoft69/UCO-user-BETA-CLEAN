/**
 * rateLimit.ts — Persistent (Postgres-backed) login throttle.
 *
 * Backed by the database rather than in-memory state so the limit is durable
 * and consistent no matter how many serverless instances are handling
 * requests.
 */
import sql from "./db";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 10;

let tableEnsured = false;

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

/** Checks whether (ip, email) has hit the failed-attempt ceiling within the current window. */
export async function isLoginRateLimited(
  ip: string,
  email: string,
): Promise<{ limited: boolean; attempts: number }> {
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
): Promise<void> {
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
export async function clearLoginAttempts(ip: string, email: string): Promise<void> {
  await ensureTable();
  await sql`DELETE FROM login_attempts WHERE ip_address = ${ip} AND email = ${email}`;
}
