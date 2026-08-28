import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

/**
 * Legacy hashing used throughout this codebase before the bcrypt migration:
 * unsalted SHA-256. Kept ONLY so existing accounts can still log in — every
 * successful legacy-hash verification triggers an automatic upgrade to bcrypt
 * (see verifyPassword's `needsRehash` flag).
 */
function legacySha256(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash);
}

/** Hash a new/changed password with bcrypt. Use this for all new writes. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash, transparently supporting both
 * bcrypt hashes and legacy unsalted-SHA256 hashes.
 *
 * Returns `needsRehash: true` when the stored hash was in the legacy format
 * and the password matched — callers should immediately re-save the password
 * using `hashPassword()` so the account is migrated off SHA-256.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { valid: false, needsRehash: false };

  if (isBcryptHash(storedHash)) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }

  // Legacy SHA-256 hash — constant-time compare to avoid timing side-channels.
  const candidate = Buffer.from(legacySha256(password));
  const stored = Buffer.from(storedHash);
  const valid =
    candidate.length === stored.length &&
    crypto.timingSafeEqual(candidate, stored);
  return { valid, needsRehash: valid };
}

/**
 * Minimum password strength policy: 8+ characters with at least three of the
 * four character classes (upper, lower, digit, symbol). Returns a list of
 * violated rules — empty array means the password passes.
 */
export function validatePasswordStrength(password: string): string[] {
  const problems: string[] = [];
  if (!password || password.length < 8) {
    problems.push("Password must be at least 8 characters long.");
  }
  if (password && password.length > 128) {
    problems.push("Password must be no more than 128 characters long.");
  }
  const classes = [
    /[a-z]/.test(password || ""),
    /[A-Z]/.test(password || ""),
    /[0-9]/.test(password || ""),
    /[^a-zA-Z0-9]/.test(password || ""),
  ].filter(Boolean).length;
  if (classes < 3) {
    problems.push(
      "Password must include at least 3 of: lowercase letters, uppercase letters, numbers, symbols.",
    );
  }
  return problems;
}
