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
      SELECT 
        COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN status = 'In-process' THEN 1 END)::int as "inProcess",
        COUNT(CASE WHEN status = 'Completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END)::int as rejected
      FROM submissions WHERE user_id = ${parseInt(userId)}
    `;

    const metrics = rows[0] || { pending: 0, inProcess: 0, completed: 0, rejected: 0 };

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};

