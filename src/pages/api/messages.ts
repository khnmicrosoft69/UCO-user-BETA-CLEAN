import type { APIRoute } from 'astro';
import sql from '../../utils/db';
import { requireAuth } from '../../utils/authz';

export const prerender = false;

async function userOwnsSubmission(submissionId: number, userId: number): Promise<boolean> {
  const rows = await sql`SELECT id FROM submissions WHERE id = ${submissionId} AND user_id = ${userId}`;
  return rows.length > 0;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // Previously had no auth check at all — anyone could read the message
    // thread for any submission just by guessing/incrementing submissionId.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    const url = new URL(request.url);
    const submissionId = url.searchParams.get('submissionId');

    if (!submissionId) {
      return new Response(JSON.stringify({ message: 'submissionId is required' }), { status: 400 });
    }

    const id = parseInt(submissionId, 10);
    if (!(await userOwnsSubmission(id, auth.userId!))) {
      return new Response(JSON.stringify({ message: 'Submission not found or unauthorized' }), { status: 404 });
    }

    const rows = await sql`
      SELECT * FROM submission_messages
      WHERE submission_id = ${id}
      ORDER BY created_at ASC
    `;

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({ message: 'Error fetching messages' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Previously trusted a client-supplied senderRole with no ownership
    // check — anyone could post into any submission's thread, and could
    // claim to be 'admin' while doing it. This portal only ever represents
    // the requester's side of the conversation, so the role is fixed
    // server-side rather than trusted from the client.
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { submissionId, message } = body;

    if (!submissionId || !message) {
      return new Response(JSON.stringify({ message: 'submissionId and message are required' }), { status: 400 });
    }

    const id = parseInt(submissionId, 10);
    if (!(await userOwnsSubmission(id, auth.userId!))) {
      return new Response(JSON.stringify({ message: 'Submission not found or unauthorized' }), { status: 404 });
    }

    await sql`
      INSERT INTO submission_messages (submission_id, message, sender_role)
      VALUES (${id}, ${message}, 'user')
    `;

    return new Response(JSON.stringify({ message: 'Message sent successfully' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(JSON.stringify({ message: 'Error sending message' }), { status: 500 });
  }
};
