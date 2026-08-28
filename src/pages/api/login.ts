import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import crypto from 'crypto';

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), { status: 400 });
    }

    // Hash incoming password to compare
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Find user
    const rows = await sql`
      SELECT id, email, full_name as "fullName", office 
      FROM user_accounts 
      WHERE email = ${email} AND password = ${hashedPassword}
    `;

    const user = rows[0];

    if (user) {
      cookies.set('session', `user:${user.id}`, {
        path: '/',
        secure: import.meta.env.PROD,
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      return new Response(JSON.stringify({ message: 'Login successful', user }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};

