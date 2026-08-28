import { defineMiddleware } from "astro:middleware";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 week, matches login.ts/register.ts

// Response.redirect() produces a Response whose headers are spec-immutable
// (Node's undici throws "TypeError: immutable" on any .set() call against
// them) — so it can't be passed through finish() below, which needs to add
// security headers. Building the redirect manually keeps the same
// 302-to-Location behavior with ordinary, mutable headers.
function redirectTo(url: URL | string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

export const onRequest = defineMiddleware((context, next) => {
  const { url, cookies } = context;

  // Wraps every response leaving this middleware — early redirects included
  // — so security headers and the sliding session refresh are applied
  // uniformly no matter which branch below produced the response.
  function finish(response: Response): Response {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), camera=(), microphone=(), payment=()",
    );

    // Sliding inactivity timeout: every request with a still-valid session
    // re-issues the cookie with a fresh Max-Age, so an idle session expires
    // ~SESSION_MAX_AGE after the user's last request rather than only at a
    // fixed point after login.
    const session = cookies.get("session");
    if (session) {
      const isHttps = url.protocol === "https:";
      cookies.set("session", session.value, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        maxAge: SESSION_MAX_AGE,
      });
    }

    return response;
  }

  // Protect user dashboard routes
  const protectedRoutes = ["/history", "/submission"];

  if (protectedRoutes.some(route => url.pathname.startsWith(route))) {
    const session = cookies.get("session");
    if (!session) {
      return finish(redirectTo(new URL("/login", url)));
    }
  }

  return next().then(finish);
});
