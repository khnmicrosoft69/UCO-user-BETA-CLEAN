import { requireSameOrigin } from "./csrf";

export interface AuthzResult {
  ok: boolean;
  userId: number | null;
  response?: Response;
}

function parseSession(cookieHeader: string): number | null {
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const [role, idStr] = decoded.split(":");
  if (role !== "user") return null;
  const id = parseInt(idStr, 10);
  return isNaN(id) ? null : id;
}

/**
 * Server-side authentication gate for API routes. Every endpoint that reads
 * or mutates a specific user's data must call this and use the returned
 * `userId` as the source of truth — never trust a userId/user_id passed in
 * a query string or request body, since that's exactly what lets one user
 * read or edit another user's submissions (IDOR).
 *
 * Also enforces the same-origin check for mutating methods (POST/PUT/PATCH/
 * DELETE) — see utils/csrf.ts — so callers get CSRF protection for free
 * alongside authentication.
 *
 * Usage:
 *   const auth = requireAuth(request);
 *   if (!auth.ok) return auth.response!;
 *   const userId = auth.userId!;
 */
export function requireAuth(request: Request): AuthzResult {
  const csrfResponse = requireSameOrigin(request);
  if (csrfResponse) {
    return { ok: false, userId: null, response: csrfResponse };
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const userId = parseSession(cookieHeader);

  if (userId === null) {
    return {
      ok: false,
      userId: null,
      response: new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  return { ok: true, userId };
}
