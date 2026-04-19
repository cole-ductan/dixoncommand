export const LEAD_SOURCES = [
  "Cold Call",
  "Referral",
  "Repeat Client",
  "Web/Inbound",
  "Walk-In",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];
