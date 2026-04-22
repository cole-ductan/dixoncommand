// HMAC-signed state token to bind the OAuth callback to a specific user.
import crypto from "crypto";

function getSecret() {
  // Reuse the service role key as the HMAC secret — it's already a strong server-only secret.
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for state signing");
  return s;
}

function b64url(buf: Buffer | string) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** Sign { userId, returnTo, ts } into a compact url-safe state string. */
export function signState(payload: { userId: string; returnTo: string }) {
  const body = JSON.stringify({ ...payload, ts: Date.now() });
  const bodyB64 = b64url(body);
  const sig = crypto.createHmac("sha256", getSecret()).update(bodyB64).digest();
  const sigB64 = b64url(sig);
  return `${bodyB64}.${sigB64}`;
}

/** Verify state and return the original payload. Throws if invalid or older than 10 minutes. */
export function verifyState(state: string): { userId: string; returnTo: string; ts: number } {
  const [bodyB64, sigB64] = state.split(".");
  if (!bodyB64 || !sigB64) throw new Error("Invalid state format");
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(bodyB64).digest();
  const providedSig = fromB64url(sigB64);
  if (
    expectedSig.length !== providedSig.length ||
    !crypto.timingSafeEqual(expectedSig, providedSig)
  ) {
    throw new Error("State signature mismatch");
  }
  const payload = JSON.parse(fromB64url(bodyB64).toString("utf8")) as {
    userId: string;
    returnTo: string;
    ts: number;
  };
  if (Date.now() - payload.ts > 10 * 60 * 1000) throw new Error("State expired");
  return payload;
}