import type { APIRoute } from 'astro';
import { requireSameOrigin } from '../../utils/csrf';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) return csrfResponse;

  // The session cookie is httpOnly, so client-side JS can no longer clear
  // it directly (document.cookie writes to an httpOnly cookie are silently
  // ignored) — this endpoint is the only way to actually end the session now.
  return new Response(JSON.stringify({ message: 'Logout successful' }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    },
  });
};
