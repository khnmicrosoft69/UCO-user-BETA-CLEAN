import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { verifyPassword, hashPassword } from '../../utils/password';
import { isLoginRateLimited, recordLoginAttempt, clearLoginAttempts } from '../../utils/rateLimit';
import { requireSameOrigin } from '../../utils/csrf';
import { getActiveMode } from '../../utils/dataSource'; // OFFLINE-MODE FEATURE
import { mysqlQuery, mysqlExec } from '../../utils/mysqlDb'; // OFFLINE-MODE FEATURE

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) return csrfResponse;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const normalizedEmail = String(email).trim().toLowerCase();
    const mode = await getActiveMode(cookies); // OFFLINE-MODE FEATURE

    // Rate limit: per (IP + email), backed by the database so it holds up
    // across cold starts and multiple concurrent serverless instances.
    const { limited } = await isLoginRateLimited(ip, normalizedEmail, mode);
    if (limited) {
      return new Response(
        JSON.stringify({ message: 'Too many failed login attempts. Please try again later.' }),
        { status: 429 },
      );
    }

    let account: any;
    if (mode === 'mysql') {
      // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
      const rows = await mysqlQuery(
        'SELECT id, email, password, full_name AS fullName, office FROM user_accounts WHERE email = ?',
        [email],
      );
      account = rows[0];
      // OFFLINE-MODE FEATURE END
    } else {
      const rows = await sql`
        SELECT id, email, password, full_name as "fullName", office
        FROM user_accounts
        WHERE email = ${email}
      `;
      account = rows[0];
    }

    if (!account || !account.password) {
      await recordLoginAttempt(ip, normalizedEmail, false, mode);
      return new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 });
    }

    const { valid, needsRehash } = await verifyPassword(password, account.password);

    if (!valid) {
      await recordLoginAttempt(ip, normalizedEmail, false, mode);
      return new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 });
    }

    if (needsRehash) {
      // Transparently migrate this account off the legacy SHA-256 hash.
      const upgraded = await hashPassword(password);
      if (mode === 'mysql') {
        // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
        await mysqlExec('UPDATE user_accounts SET password = ? WHERE id = ?', [upgraded, account.id]);
        // OFFLINE-MODE FEATURE END
      } else {
        await sql`UPDATE user_accounts SET password = ${upgraded} WHERE id = ${account.id}`;
      }
    }

    await clearLoginAttempts(ip, normalizedEmail, mode);

    const user = { id: account.id, email: account.email, fullName: account.fullName, office: account.office };

    cookies.set('session', `user:${user.id}`, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    });

    return new Response(JSON.stringify({ message: 'Login successful', user }), { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};
