import type { APIRoute } from 'astro';
import sql from '../../utils/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ message: 'User ID is required' }), { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM submissions 
      WHERE user_id = ${parseInt(userId)} 
      ORDER BY created_at DESC
    `;

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};

