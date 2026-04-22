/**
 * Google OAuth scopes used by the Dixon Command Center.
 * Centralized so callback + start route stay in sync.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
] as const;

export const GOOGLE_SCOPE_STRING = GOOGLE_SCOPES.join(" ");