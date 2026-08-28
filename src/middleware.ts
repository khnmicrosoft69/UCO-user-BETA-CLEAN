import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  const { url, cookies } = context;

  // Protect user dashboard routes
  const protectedRoutes = ["/history", "/submission"];
  
  if (protectedRoutes.some(route => url.pathname.startsWith(route))) {
    const session = cookies.get("session");
    if (!session) {
      return Response.redirect(new URL("/login", url), 302);
    }
  }

  return next();
});
