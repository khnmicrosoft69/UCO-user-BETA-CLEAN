// OFFLINE-MODE FEATURE
// Serves submission attachments from the local uploads/ folder — needed
// because submit.ts saves files here (instead of Supabase Storage) when
// running in MySQL/offline mode. Delete this route along with the rest of
// the offline-mode feature to remove it.
import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { requireAuth } from '../../../utils/authz';

export const prerender = false;

// Every served path MUST resolve to inside this directory — the
// containment check below is what actually prevents path traversal, not
// the decode/normalize step above it.
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export const GET: APIRoute = async ({ params, request }) => {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response!;

  const filePathParam = params.path;
  if (!filePathParam) return new Response('Missing path', { status: 400 });

  const decodedPath = decodeURIComponent(filePathParam).replace(/\\/g, path.sep);
  const filePath = path.resolve(UPLOADS_ROOT, decodedPath);

  if (filePath !== UPLOADS_ROOT && !filePath.startsWith(UPLOADS_ROOT + path.sep)) {
    return new Response('Invalid path', { status: 400 });
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return new Response('File not found', { status: 404 });
  }

  const file = fs.readFileSync(filePath);
  const contentType = mime.lookup(filePath) || 'application/octet-stream';

  return new Response(file, {
    status: 200,
    headers: {
      'content-type': contentType,
      'Content-Length': file.length.toString(),
    },
  });
};
