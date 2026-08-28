import type { APIRoute } from 'astro';
import sql from '../../utils/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const submissionId = url.searchParams.get('submissionId');

    if (!submissionId) {
      return new Response(JSON.stringify({ message: 'submissionId is required' }), { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM submission_messages 
      WHERE submission_id = ${parseInt(submissionId)} 
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
    const body = await request.json();
    const { submissionId, message, senderRole } = body;

    if (!submissionId || !message || !senderRole) {
      return new Response(JSON.stringify({ message: 'submissionId, message, and senderRole are required' }), { status: 400 });
    }

    await sql`
      INSERT INTO submission_messages (submission_id, message, sender_role) 
      VALUES (${parseInt(submissionId)}, ${message}, ${senderRole})
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

