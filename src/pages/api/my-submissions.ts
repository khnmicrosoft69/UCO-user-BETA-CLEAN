import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { requireAuth } from '../../utils/authz';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Previously trusted a client-supplied ?userId= query param with no
    // session check at all — any caller could read any other user's
    // submissions (name, phone number, event details) just by changing the
    // number in the URL. The session is now the only source of truth for
    // whose submissions get returned.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    const rows = await sql`
      SELECT * FROM submissions
      WHERE user_id = ${auth.userId}
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
