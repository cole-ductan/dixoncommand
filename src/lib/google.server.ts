// Server-only helpers for Google OAuth + API calls.
// Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { GOOGLE_SCOPE_STRING } from "@/lib/googleScopes";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function getEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET environment variables.",
    );
  }
  return { clientId, clientSecret };
}

/** Build the redirect URI based on the current request origin. */
export function buildRedirectUri(origin: string) {
  return `${origin}/api/public/google/callback`;
}

/** Exchange an auth code for tokens. */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getEnv();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  };
}

/** Refresh an access token using a stored refresh token. */
export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

/** Fetch user's Google email using the access token. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

/**
 * Get a valid (non-expired) access token for a user.
 * Auto-refreshes if expired or about to expire (within 60s).
 * Returns null if the user has no connection.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: row, error } = await supabaseAdmin
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load Google tokens: ${error.message}`);
  if (!row) return null;

  const expiresAt = new Date(row.expires_at).getTime();
  const now = Date.now();
  if (expiresAt - now > 60_000) {
    return row.access_token;
  }

  // Refresh
  const refreshed = await refreshAccessToken(row.refresh_token);
  const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();
  const { error: updErr } = await supabaseAdmin
    .from("google_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
      scope: refreshed.scope,
    })
    .eq("user_id", userId);
  if (updErr) throw new Error(`Failed to persist refreshed token: ${updErr.message}`);
  return refreshed.access_token;
}

/** Persist (insert or update) a token bundle for a user. */
export async function upsertTokens(args: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  googleEmail: string | null;
}) {
  const expires_at = new Date(Date.now() + args.expiresIn * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("google_tokens")
    .upsert(
      {
        user_id: args.userId,
        access_token: args.accessToken,
        refresh_token: args.refreshToken,
        expires_at,
        scope: args.scope,
        google_email: args.googleEmail,
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`Failed to save Google tokens: ${error.message}`);
}

export { GOOGLE_SCOPE_STRING };