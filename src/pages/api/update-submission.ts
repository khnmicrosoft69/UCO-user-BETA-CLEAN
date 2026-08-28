import type { APIRoute } from 'astro';
import sql from '../../utils/db';

export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { id, user_id, office_name, request_type, mName, nNo, socMed, service, eventDetails } = data;

    if (!id || !user_id) {
      return new Response(JSON.stringify({ message: 'Submission ID and User ID are required' }), { status: 400 });
    }

    // Ensure the submission belongs to the user
    const check = await sql`SELECT id FROM submissions WHERE id = ${id} AND user_id = ${user_id}`;
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
      WHERE id = ${id} AND user_id = ${user_id}
    `;

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
