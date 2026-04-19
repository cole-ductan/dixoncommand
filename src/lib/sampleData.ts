import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds a handful of realistic Dixon-style demo events spread across stages,
 * plus matching organizations, contacts, and a few tasks. Idempotent-ish:
 * skips if the user already has 3+ events.
 */
export async function seedSampleData(userId: string) {
  const existing = await supabase.from("events").select("id", { count: "exact", head: true });
  if ((existing.count ?? 0) >= 3) return { skipped: true as const };

  const orgs = [
    { name: "Bay Area Junior Golf Foundation", cause: "Youth golf scholarships" },
    { name: "St. Vincent's Charity Open", cause: "Local food bank" },
    { name: "Veterans Tee-Off Classic", cause: "Veteran mental health" },
    { name: "Riverside Rotary Club", cause: "Community grants" },
    { name: "Greenfield Memorial Tournament", cause: "Cancer research" },
    { name: "First Tee — Green Bay", cause: "Youth development" },
  ];

  const { data: orgRows, error: orgErr } = await supabase
    .from("organizations")
    .insert(orgs.map((o) => ({ ...o, user_id: userId })))
    .select();
  if (orgErr) throw orgErr;

  const contacts = orgRows!.map((o, i) => ({
    user_id: userId,
    organization_id: o.id,
    name: ["Sarah Mitchell", "Tom Reynolds", "Maria Lopez", "James Chen", "Patricia Hill", "Derek Walters"][i],
    email: `contact${i + 1}@example.org`,
    phone: `(555) 010-${1000 + i}`,
    role: ["Director", "Tournament Chair", "Fundraising Lead", "President", "Coordinator", "Volunteer Lead"][i],
  }));
  const { data: contactRows, error: cErr } = await supabase.from("contacts").insert(contacts).select();
  if (cErr) throw cErr;

  const today = new Date();
  const inDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

  const events = [
    { idx: 0, name: "BAJGF Annual Scholarship Classic", stage: "new_lead", course: "Pebble Creek GC", days: 60, hot: false, where_left_off: "Initial cold call — left voicemail." },
    { idx: 1, name: "St. Vincent's Charity Open", stage: "contacted", course: "Riverbend Country Club", days: 45, hot: true, where_left_off: "Pitched amateur endorsement, awaiting email reply." },
    { idx: 2, name: "Veterans Tee-Off Classic", stage: "pitch_delivered", course: "Eagle Ridge Resort", days: 30, hot: true, where_left_off: "Loved Par 3 + Par 5. Wants to confirm dates with committee." },
    { idx: 3, name: "Riverside Rotary Open", stage: "challenges_booked", course: "Riverside Muni", days: 21, hot: false, where_left_off: "Both challenges booked. Need to send CGT walkthrough." },
    { idx: 4, name: "Greenfield Memorial Tournament", stage: "cgt_created", course: "Greenfield CC", days: 14, hot: false, where_left_off: "CGT site live. Discussing sponsor packages next." },
    { idx: 5, name: "First Tee Green Bay Spring Scramble", stage: "follow_up_scheduled", course: "Brown County Public", days: 7, hot: true, where_left_off: "Scheduled follow-up to confirm player gift order." },
  ];

  const eventInserts = events.map((e) => ({
    user_id: userId,
    organization_id: orgRows![e.idx].id,
    primary_contact_id: contactRows![e.idx].id,
    event_name: e.name,
    event_date: inDays(e.days),
    course: e.course,
    stage: e.stage as any,
    hot_lead: e.hot,
    where_left_off: e.where_left_off,
    interest_par3: e.stage !== "new_lead",
    interest_par5: ["pitch_delivered", "challenges_booked", "cgt_created", "follow_up_scheduled"].includes(e.stage),
    interest_cgt: ["challenges_booked", "cgt_created", "follow_up_scheduled"].includes(e.stage),
    par3_booked: ["challenges_booked", "cgt_created", "follow_up_scheduled"].includes(e.stage),
    par5_booked: ["challenges_booked", "cgt_created", "follow_up_scheduled"].includes(e.stage),
    cgt_created: ["cgt_created", "follow_up_scheduled"].includes(e.stage),
    amateur_endorsement_sent: e.stage !== "new_lead",
    player_count: 80 + e.idx * 12,
    entry_fee: 150 + e.idx * 25,
    last_contact_at: new Date().toISOString(),
  }));

  const { data: eventRows, error: evErr } = await supabase.from("events").insert(eventInserts).select();
  if (evErr) throw evErr;

  const tasks = [
    { event_id: eventRows![0].id, action: "Try call again — left VM yesterday", offsetHours: -18, priority: "high" },
    { event_id: eventRows![1].id, action: "Confirm AE email received", offsetHours: 4, priority: "normal" },
    { event_id: eventRows![2].id, action: "Lock in Par 3 + Par 5 dates", offsetHours: 28, priority: "high" },
    { event_id: eventRows![3].id, action: "Send CGT walkthrough Loom", offsetHours: 50, priority: "normal" },
    { event_id: eventRows![5].id, action: "Confirm gift order quantities", offsetHours: 2, priority: "urgent" },
  ];
  const taskInserts = tasks.map((t) => ({
    user_id: userId,
    event_id: t.event_id,
    next_action: t.action,
    next_action_at: new Date(today.getTime() + t.offsetHours * 3600000).toISOString(),
    priority: t.priority as any,
  }));
  await supabase.from("tasks").insert(taskInserts);

  return { skipped: false as const, count: events.length };
}
