import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { requireAuth } from '../../utils/authz';
import { getActiveMode } from '../../utils/dataSource'; // OFFLINE-MODE FEATURE
import { mysqlQuery } from '../../utils/mysqlDb'; // OFFLINE-MODE FEATURE

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Same IDOR issue as my-submissions.ts — the session, not a client-
    // supplied userId, decides whose metrics get computed.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    const mode = await getActiveMode(cookies); // OFFLINE-MODE FEATURE

    // The status values here previously didn't match what's actually stored
    // (submissions.status is 'Pending' | 'Processing' | 'Completed' | 'Not
    // Accepted' — 'In-process'/'Rejected' never matched anything, so those
    // two counts were always 0).
    const rows = mode === 'mysql'
      // OFFLINE-MODE FEATURE START - delete this ternary branch to remove the MySQL fallback
      ? await mysqlQuery(
          `SELECT
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'Processing' THEN 1 END) as inProcess,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'Not Accepted' THEN 1 END) as rejected
          FROM submissions WHERE user_id = ?`,
          [auth.userId],
        )
      // OFFLINE-MODE FEATURE END
      : await sql`
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
