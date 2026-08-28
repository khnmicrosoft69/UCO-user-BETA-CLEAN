// OFFLINE-MODE FEATURE
// Delete this file to remove the manual online/offline DB-mode switch API.
import type { APIRoute } from 'astro';
import { getActiveMode } from '../../../utils/dataSource';

export const prerender = false;

const COOKIE_NAME = 'db_mode';

export const GET: APIRoute = async ({ cookies }) => {
  const override = cookies.get(COOKIE_NAME)?.value ?? null;
  const active = await getActiveMode(cookies);
  return new Response(JSON.stringify({ override, active }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { mode?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { mode } = body;

  if (mode === 'supabase' || mode === 'mysql') {
    cookies.set(COOKIE_NAME, mode, { path: '/', maxAge: 60 * 60 * 24 * 30 });
  } else if (mode === 'auto') {
    cookies.delete(COOKIE_NAME, { path: '/' });
  } else {
    return new Response(JSON.stringify({ error: "mode must be 'supabase', 'mysql', or 'auto'" }), { status: 400 });
  }

  const active = await getActiveMode(cookies);
  return new Response(JSON.stringify({ override: mode === 'auto' ? null : mode, active }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
