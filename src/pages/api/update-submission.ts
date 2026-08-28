import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { requireAuth } from '../../utils/authz';
import { getActiveMode } from '../../utils/dataSource'; // OFFLINE-MODE FEATURE
import { mysqlQuery, mysqlExec } from '../../utils/mysqlDb'; // OFFLINE-MODE FEATURE

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Previously the "ownership" check compared the submission's user_id
    // against a user_id the CLIENT supplied in the same request body — an
    // attacker just had to send the real owner's id alongside someone
    // else's submission id and the check would trivially pass. The session
    // is now the only source of truth for who's making this request.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    const data = await request.json();
    const { id, office_name, request_type, mName, nNo, socMed, service, eventDetails } = data;

    if (!id) {
      return new Response(JSON.stringify({ message: 'Submission ID is required' }), { status: 400 });
    }

    const mode = await getActiveMode(cookies); // OFFLINE-MODE FEATURE

    if (mode === 'mysql') {
      // OFFLINE-MODE FEATURE START - delete this block to remove the MySQL fallback
      const check = await mysqlQuery('SELECT id FROM submissions WHERE id = ? AND user_id = ?', [id, auth.userId]);
      if (check.length === 0) {
        return new Response(JSON.stringify({ message: 'Submission not found or unauthorized' }), { status: 404 });
      }

      await mysqlExec(
        `UPDATE submissions
         SET
           office_name = COALESCE(?, office_name),
           request_type = COALESCE(?, request_type),
           \`mName\` = COALESCE(?, \`mName\`),
           \`nNo\` = COALESCE(?, \`nNo\`),
           \`socMed\` = COALESCE(?, \`socMed\`),
           service = COALESCE(?, service),
           \`eventDetails\` = COALESCE(?, \`eventDetails\`)
         WHERE id = ? AND user_id = ?`,
        [
          office_name || null, request_type || null, mName || null, nNo || null,
          socMed || null, service || null, eventDetails || null, id, auth.userId,
        ],
      );
      // OFFLINE-MODE FEATURE END
    } else {
      // Ensure the submission belongs to the authenticated user
      const check = await sql`SELECT id FROM submissions WHERE id = ${id} AND user_id = ${auth.userId}`;
      if (check.length === 0) {
         return new Response(JSON.stringify({ message: 'Submission not found or unauthorized' }), { status: 404 });
      }

      await sql`
        UPDATE submissions
        SET
          office_name = COALESCE(${office_name || null}, office_name),
          request_type = COALESCE(${request_type || null}, request_type),
          "mName" = COALESCE(${mName || null}, "mName"),
          "nNo" = COALESCE(${nNo || null}, "nNo"),
          "socMed" = COALESCE(${socMed || null}, "socMed"),
          service = COALESCE(${service || null}, service),
          "eventDetails" = COALESCE(${eventDetails || null}, "eventDetails")
        WHERE id = ${id} AND user_id = ${auth.userId}
      `;
    }

    return new Response(JSON.stringify({ message: 'Submission updated successfully' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Update error:', error);
    return new Response(
      JSON.stringify({ message: 'Error updating submission', error: error.message }),
      { status: 500 }
    );
  }
};
