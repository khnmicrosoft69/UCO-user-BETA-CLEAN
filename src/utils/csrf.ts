/**
 * csrf.ts — Origin/Referer verification for state-changing requests.
 *
 * The session cookie is SameSite=Lax, which already stops it being attached
 * to cross-site fetch/XHR calls, and every mutating endpoint requires a
 * `application/json` body, which forces a CORS preflight that the server
 * never approves for foreign origins. This check is a second, independent
 * layer on top of that: it confirms the request's own Origin/Referer header
 * names this same host, so a mutating request can't succeed even in a
 * browser/proxy configuration where the cookie-based defenses above don't
 * hold (e.g. an older browser that ignores SameSite).
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostFromHeaderValue(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Returns true when the request's Origin (preferred) or Referer header
 * names the same host this server is running on. A same-origin
 * fetch/XHR/form submission always sends at least one of these — their
 * absence on a mutating request is itself treated as suspicious.
 */
export function isSameOriginRequest(request: Request): boolean {
  const requestHost = hostFromHeaderValue(request.url);
  if (!requestHost) return false;

  const originHost = hostFromHeaderValue(request.headers.get("origin"));
  if (originHost) return originHost === requestHost;

  const refererHost = hostFromHeaderValue(request.headers.get("referer"));
  if (refererHost) return refererHost === requestHost;

  return false;
}

/**
 * Call at the top of any handler for POST/PUT/PATCH/DELETE. Returns a 403
 * Response to short-circuit the request if it fails the same-origin check;
 * returns null when the request is safe to continue processing (including
 * all non-mutating GET/HEAD requests, which this never blocks).
 */
export function requireSameOrigin(request: Request): Response | null {
  if (!MUTATING_METHODS.has(request.method)) return null;
  if (isSameOriginRequest(request)) return null;

  return new Response(
    JSON.stringify({ error: "Cross-site request blocked." }),
    { status: 403, headers: { "content-type": "application/json" } },
  );
}
