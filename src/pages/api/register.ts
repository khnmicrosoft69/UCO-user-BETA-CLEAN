import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import crypto from 'crypto';

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  try {
    const { email, password, fullName, office } = await request.json();

    if (!email || !password || !fullName || !office) {
      return new Response(JSON.stringify({ message: 'All fields are required' }), { status: 400 });
    }
    

    // Check if user exists
    const existing = await sql`SELECT id FROM user_accounts WHERE email = ${email}`;
    if (existing.length > 0) {
      return new Response(JSON.stringify({ message: 'Email already registered' }), { status: 400 });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Insert user
    const result = await sql`
      INSERT INTO user_accounts (email, password, full_name, office) 
      VALUES (${email}, ${hashedPassword}, ${fullName}, ${office})
      RETURNING id
    `;

    const userId = result[0].id;
    const user = { id: userId, email, fullName, office };

    cookies.set('session', `user:${userId}`, {
      path: '/',
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return new Response(JSON.stringify({ message: 'User registered successfully', user }), { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};

