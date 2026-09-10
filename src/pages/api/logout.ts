import type { APIRoute } from 'astro';
import { requireSameOrigin } from '../../utils/csrf';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) return csrfResponse;

  // The session cookie is httpOnly, so client-side JS can no longer clear
  // it directly (document.cookie writes to an httpOnly cookie are silently
  // ignored) — this endpoint is the only way to actually end the session now.
  //
  // Clear it through Astro's cookie API rather than a hand-written Set-Cookie
  // header. On Vercel the live cookie carries a `Secure` attribute (login.ts
  // sets `secure: import.meta.env.PROD`), and the old literal header omitted
  // it — so the deletion and the real cookie no longer matched on attributes
  // and the browser kept the session. cookies.delete() lets the adapter emit
  // an expiry that matches, and routes it through the same pipeline the
  // middleware uses so there is a single authority for this cookie.
  cookies.delete('session', { path: '/' });

  return new Response(JSON.stringify({ message: 'Logout successful' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
