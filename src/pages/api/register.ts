import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { hashPassword, validatePasswordStrength } from '../../utils/password';
import { requireSameOrigin } from '../../utils/csrf';
import { getActiveMode } from '../../utils/dataSource'; // OFFLINE-MODE FEATURE
import { mysqlQuery, mysqlExec } from '../../utils/mysqlDb'; // OFFLINE-MODE FEATURE

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) return csrfResponse;

  const mode = await getActiveMode(cookies); // OFFLINE-MODE FEATURE

  try {
    const { email, password, fullName, office } = await request.json();

    if (!email || !password || !fullName || !office) {
      return new Response(JSON.stringify({ message: 'All fields are required' }), { status: 400 });
    }

    const passwordProblems = validatePasswordStrength(password);
    if (passwordProblems.length > 0) {
      return new Response(JSON.stringify({ message: passwordProblems[0] }), { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    let userId: number;

    if (mode === 'mysql') {
      // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
      const existing = await mysqlQuery('SELECT id FROM user_accounts WHERE email = ?', [email]);
      if (existing.length > 0) {
        return new Response(JSON.stringify({ message: 'Email already registered' }), { status: 400 });
      }
      const result = await mysqlExec(
        'INSERT INTO user_accounts (email, password, full_name, office) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, fullName, office],
      );
      userId = result.insertId;
      // OFFLINE-MODE FEATURE END
    } else {
      // Check if user exists
      const existing = await sql`SELECT id FROM user_accounts WHERE email = ${email}`;
      if (existing.length > 0) {
        return new Response(JSON.stringify({ message: 'Email already registered' }), { status: 400 });
      }

      const result = await sql`
        INSERT INTO user_accounts (email, password, full_name, office)
        VALUES (${email}, ${hashedPassword}, ${fullName}, ${office})
        RETURNING id
      `;
      userId = result[0].id;
    }

    const user = { id: userId, email, fullName, office };

    cookies.set('session', `user:${userId}`, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    });

    return new Response(JSON.stringify({ message: 'User registered successfully', user }), { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    // Unique-constraint violation — a concurrent request registered this
    // email between our existence check above and the INSERT.
    if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') { // ER_DUP_ENTRY is MySQL's equivalent - OFFLINE-MODE FEATURE
      return new Response(JSON.stringify({ message: 'Email already registered' }), { status: 400 });
    }
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};
