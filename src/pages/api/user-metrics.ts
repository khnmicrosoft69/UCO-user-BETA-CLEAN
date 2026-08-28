import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { requireAuth } from '../../utils/authz';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Same IDOR issue as my-submissions.ts — the session, not a client-
    // supplied userId, decides whose metrics get computed.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    // The status values here previously didn't match what's actually stored
    // (submissions.status is 'Pending' | 'Processing' | 'Completed' | 'Not
    // Accepted' — 'In-process'/'Rejected' never matched anything, so those
    // two counts were always 0).
    const rows = await sql`
      SELECT
        COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN status = 'Processing' THEN 1 END)::int as "inProcess",
        COUNT(CASE WHEN status = 'Completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'Not Accepted' THEN 1 END)::int as rejected
      FROM submissions WHERE user_id = ${auth.userId}
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
