const securityHeaders = {
  "Content-Type": "text/html; charset=UTF-8",
  "Cache-Control": "public, max-age=60",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; script-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      const response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
      return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
    }
    if (["/robots.txt", "/sitemap.xml", "/favicon.svg"].includes(url.pathname)) {
      const response = await env.ASSETS.fetch(new Request(new URL(url.pathname, request.url), request));
      const headers = new Headers(response.headers);
      const types = {"/robots.txt":"text/plain; charset=UTF-8","/sitemap.xml":"application/xml; charset=UTF-8","/favicon.svg":"image/svg+xml"};
      headers.set("Content-Type", types[url.pathname]);
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(request.method === "HEAD" ? null : response.body, {status: response.status, headers});
    }
    if (url.pathname === "/index.html") return Response.redirect(url.origin + "/", 301);
    const assetPath = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
    const assetResponse = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request));
    if (assetResponse.ok) {
      const headers = new Headers(assetResponse.headers);
      for (const [key, value] of Object.entries(securityHeaders)) {
        if (key !== "Content-Type") headers.set(key, value);
      }
      return new Response(request.method === "HEAD" ? null : assetResponse.body, {status: assetResponse.status, headers});
    }
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=UTF-8", "X-Content-Type-Options": "nosniff" } });
  }
};
