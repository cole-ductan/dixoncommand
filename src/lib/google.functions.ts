// Server functions for Google OAuth + Gmail send (callable from client).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  GOOGLE_SCOPE_STRING,
  getValidAccessToken,
} from "@/lib/google.server";
import { signState } from "@/lib/googleState.server";

const StartSchema = z.object({
  origin: z.string().url(),
  returnTo: z.string().min(1).max(200),
});

/** Build the Google OAuth consent URL for the current user. */
export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");

    const redirectUri = `${data.origin}/api/public/google/callback`;
    const state = signState({ userId: context.userId, returnTo: data.returnTo });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE_STRING,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  });

/** Get the user's current Google connection status. */
export const getGoogleStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("google_tokens")
      .select("google_email, scope, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      connected: !!data,
      email: data?.google_email ?? null,
      scope: data?.scope ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  });

/** Disconnect: delete tokens. */
export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin
      .from("google_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

const SendSchema = z.object({
  to: z.string().min(3).max(500),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  eventId: z.string().uuid().optional(),
});

function encodeRfc2822(to: string, fromEmail: string, subject: string, body: string) {
  // Encode subject for non-ASCII safety (RFC 2047)
  const subjectEncoded = /[^\x20-\x7E]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`
    : subject;
  const message = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subjectEncoded}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ].join("\r\n");
  // base64url
  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Send an email via Gmail API using the user's connected account. */
export const sendGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = await getValidAccessToken(context.userId);
    if (!accessToken) {
      throw new Error("Google account not connected. Connect from Settings to send via Gmail.");
    }

    // Look up the user's google email for the From header
    const { data: tokenRow } = await supabaseAdmin
      .from("google_tokens")
      .select("google_email")
      .eq("user_id", context.userId)
      .maybeSingle();
    const fromEmail = tokenRow?.google_email ?? "me";

    const raw = encodeRfc2822(data.to, fromEmail, data.subject, data.body);
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail send failed [${res.status}]: ${text}`);
    }
    const sent = (await res.json()) as { id: string; threadId: string };

    // Log to emails table
    try {
      await supabaseAdmin.from("emails").insert({
        user_id: context.userId,
        event_id: data.eventId ?? null,
        subject: data.subject,
        body: data.body,
        sent_status: "sent",
        template_used: "gmail_api",
      });
    } catch (e) {
      // Non-fatal: log but still succeed
      console.error("Failed to log sent email:", e);
    }

    return { success: true, messageId: sent.id, threadId: sent.threadId };
  });