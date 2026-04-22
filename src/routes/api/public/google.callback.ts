import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
  upsertTokens,
  buildRedirectUri,
} from "@/lib/google.server";
import { verifyState } from "@/lib/googleState.server";

function htmlResponse(opts: { ok: boolean; message: string; returnTo?: string }) {
  const safeReturn = opts.returnTo && opts.returnTo.startsWith("/") ? opts.returnTo : "/";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${opts.ok ? "Connected" : "Connection failed"}</title>
  <meta http-equiv="refresh" content="2;url=${safeReturn}" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
           background: #0a0a0a; color: #fafafa; display: grid; place-items: center;
           min-height: 100vh; margin: 0; padding: 1rem; }
    .card { max-width: 460px; padding: 2rem; border-radius: 14px; background: #1a1a1a;
            border: 1px solid #2a2a2a; text-align: center; }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { margin: 0; color: #a1a1aa; font-size: 0.9rem; }
    .ok { color: #4ade80; }
    .err { color: #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="${opts.ok ? "ok" : "err"}">${opts.ok ? "✓ Google Connected" : "✗ Connection Failed"}</h1>
    <p>${opts.message}</p>
    <p style="margin-top:1rem;font-size:0.75rem;">Returning you to the app…</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: opts.ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const errorParam = url.searchParams.get("error");

          if (errorParam) {
            return htmlResponse({
              ok: false,
              message: `Google returned: ${errorParam}`,
            });
          }
          if (!code || !state) {
            return htmlResponse({ ok: false, message: "Missing authorization code or state." });
          }

          const payload = verifyState(state);
          const redirectUri = buildRedirectUri(url.origin);
          const tokens = await exchangeCodeForTokens(code, redirectUri);

          if (!tokens.refresh_token) {
            return htmlResponse({
              ok: false,
              message:
                "No refresh token received. Revoke the app at myaccount.google.com/permissions and try again.",
              returnTo: payload.returnTo,
            });
          }

          const googleEmail = await fetchGoogleEmail(tokens.access_token);

          await upsertTokens({
            userId: payload.userId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            scope: tokens.scope,
            googleEmail,
          });

          return htmlResponse({
            ok: true,
            message: googleEmail
              ? `Signed in as ${googleEmail}.`
              : "Your Google account is now connected.",
            returnTo: payload.returnTo,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error("Google OAuth callback error:", msg);
          return htmlResponse({ ok: false, message: msg });
        }
      },
    },
  },
});