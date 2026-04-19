export type Stage =
  | "new_lead"
  | "contacted"
  | "left_voicemail"
  | "call_back_needed"
  | "pitch_delivered"
  | "challenges_booked"
  | "cgt_created"
  | "proposal_sent"
  | "follow_up_scheduled"
  | "closed_won"
  | "closed_lost";

export const STAGES: { id: Stage; label: string; tokenVar: string }[] = [
  { id: "new_lead",            label: "New Lead",          tokenVar: "var(--stage-new)" },
  { id: "contacted",           label: "Contacted",         tokenVar: "var(--stage-contacted)" },
  { id: "left_voicemail",      label: "Left Voicemail",    tokenVar: "var(--stage-vm)" },
  { id: "call_back_needed",    label: "Call Back Needed",  tokenVar: "var(--stage-callback)" },
  { id: "pitch_delivered",     label: "Pitch Delivered",   tokenVar: "var(--stage-pitch)" },
  { id: "challenges_booked",   label: "Challenges Booked", tokenVar: "var(--stage-booked)" },
  { id: "cgt_created",         label: "CGT Created",       tokenVar: "var(--stage-cgt)" },
  { id: "proposal_sent",       label: "Proposal Sent",     tokenVar: "var(--stage-proposal)" },
  { id: "follow_up_scheduled", label: "Follow-Up Scheduled", tokenVar: "var(--stage-followup)" },
  { id: "closed_won",          label: "Closed Won",        tokenVar: "var(--stage-won)" },
  { id: "closed_lost",         label: "Closed Lost",       tokenVar: "var(--stage-lost)" },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const stageColor = (s: Stage) => STAGES.find((x) => x.id === s)?.tokenVar ?? "var(--muted)";
