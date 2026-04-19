/**
 * Live Call Pipeline — 11 guided steps mirroring the Notion
 * "Live Call Pipeline - ALL IN ONE" workflow. Each step ships
 * with the script lines, decision branches, and the event field
 * keys that should be captured at that step.
 */

export type CaptureField =
  // event fields
  | "event_name"
  | "course"
  | "event_date"
  | "event_time"
  | "player_count"
  | "entry_fee"
  | "funds_use"
  | "pain_points"
  | "sponsorship_details"
  | "registration_method"
  | "player_gift_budget"
  | "event_website"
  | "amateur_endorsement_sent"
  | "interest_par3"
  | "interest_par5"
  | "par3_booked"
  | "par5_booked"
  | "check_payable_to"
  | "check_mail_to"
  | "check_address"
  | "cgt_created"
  | "cgt_url"
  | "custom_products_sold"
  | "auction_referred"
  | "where_left_off"
  // contact fields
  | "contact_name"
  | "contact_email"
  | "contact_phone";

export type DecisionBranch = {
  label: string;
  /** Slug of the step to jump to, or "wrap" for end-of-call. */
  goto: string;
  /** Optional event patch applied when this branch is chosen. */
  patch?: Record<string, unknown>;
  variant?: "primary" | "default" | "muted";
};

export type PipelineStep = {
  slug: string;
  number: number | "PRE";
  emoji: string;
  title: string;
  /** One-line subtitle for the step header. */
  subtitle?: string;
  /** Big quoted script lines — what the TC says. */
  scriptLines?: string[];
  /** Bullet checklist (instructions / actions). */
  checklist?: string[];
  /** Field keys to nudge the TC to fill at this step. */
  capture?: CaptureField[];
  /** Branches that move to another step. */
  decisions?: DecisionBranch[];
  /** Optional callout shown above the script. */
  callout?: { tone: "info" | "warn" | "critical"; text: string };
};

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    slug: "pre_call",
    number: "PRE",
    emoji: "☎️",
    title: "Pre-Call — Calling Mode Setup",
    subtitle: "Read notes. Trust the queue. Aim for 3–6 month lead time.",
    callout: {
      tone: "info",
      text: "Before you dial, read every prior note on this lead. Yellow line in the database = scheduled follow-up.",
    },
    checklist: [
      "Open the lead's previous notes & 'Where We Left Off'",
      "Confirm time zone, contact name, and event date",
      "Have email templates and offers tab ready",
      "Headset on, distractions off",
    ],
    decisions: [
      { label: "Dialing now → No Answer", goto: "voicemail", variant: "muted" },
      { label: "Dialing now → They Picked Up", goto: "intro", variant: "primary" },
    ],
  },
  {
    slug: "voicemail",
    number: 1,
    emoji: "📵",
    title: "Step 1 — Voicemail",
    subtitle: "Do NOT mention 'Dixon Golf'. Curiosity gets callbacks.",
    callout: {
      tone: "warn",
      text: "Never say 'Dixon Golf' in the voicemail. They call back out of curiosity, not because they think it's a sales call.",
    },
    scriptLines: [
      "Hi, this is [YOUR NAME]. I was calling about your [TOURNAMENT NAME] golf tournament. I was interested in donating an item to the raffle or sponsoring your event, but wanted to hear a little more about it. If you could give me a call back that would be great. My number is [YOUR PHONE].",
    ],
    checklist: [
      "Click 'Left Voicemail' below to set the stage",
      "Do NOT schedule a follow-up just for a voicemail",
      "Move to the next call",
    ],
    decisions: [
      {
        label: "Mark Left Voicemail & wrap",
        goto: "wrap",
        patch: { stage: "left_voicemail" },
        variant: "primary",
      },
    ],
  },
  {
    slug: "intro",
    number: 2,
    emoji: "🟢",
    title: "Step 2 — Live Introduction",
    subtitle: "They picked up. Friendly, consultative — partner, not salesperson.",
    callout: {
      tone: "critical",
      text: "Click 'Picked Up' the INSTANT they answer. The Calling Mode timer is running.",
    },
    scriptLines: [
      "Hi, this is [YOUR NAME] from Dixon Golf. We sponsor a number of charity golf events as part of our marketing. We heard about your upcoming event and I wanted to see if it's something we want to sponsor. Could you tell me a bit about your event?",
    ],
    capture: ["contact_name", "contact_email", "contact_phone"],
    decisions: [
      { label: "They're talking → Discovery", goto: "discovery", variant: "primary" },
      { label: "Suspicious / 'What's the catch?'", goto: "objections" },
      { label: "Busy right now → Schedule callback", goto: "follow_up" },
    ],
  },
  {
    slug: "discovery",
    number: 3,
    emoji: "🔍",
    title: "Step 3 — Discovery (the most important step)",
    subtitle: "The more they talk, the more they like you. Capture as they speak.",
    callout: {
      tone: "info",
      text: "Stay in Discovery as long as possible. Listen, ask follow-ups, never educate them about their own event.",
    },
    scriptLines: [
      "Background — Specific use for the funds, or general? How many years have you done it? How long have you been involved? What's the hardest part of running it? What's your overall goal this year?",
      "Logistics — Date and time? Which course? Entry fee? How many players? When does registration open? What do you sell at registration? Any games on the course already? What happens after the round?",
      "Sponsorship — What do current sponsorships look like (pricing, tiers)? Donations from local businesses? Player-gift budget? How do you process registrations & payments? Event website?",
    ],
    capture: [
      "event_name",
      "course",
      "event_date",
      "event_time",
      "player_count",
      "entry_fee",
      "funds_use",
      "pain_points",
      "sponsorship_details",
      "registration_method",
      "player_gift_budget",
      "event_website",
    ],
    decisions: [
      { label: "Discovery complete → Amateur Endorsement", goto: "amateur", variant: "primary" },
      { label: "Objection raised", goto: "objections" },
    ],
  },
  {
    slug: "amateur",
    number: 4,
    emoji: "🎁",
    title: "Step 4 — Offer Free Stuff (Amateur Endorsement)",
    subtitle: "Your first yes. Get the email, send the call email immediately.",
    scriptLines: [
      "Great, we can certainly support what you're doing by sending you an Amateur Endorsement. It's a prize for you to give to a player at your event — free hat, free golf balls, free divot tool, and discounts for a whole year. A $50 value.",
      "What's your email address so that I can email you the prize redemption certificate?",
      "I'm sending it to you now. It contains the word 'FREE' a few times so it'll most likely be in your spam folder. Subject is 'Dixon Advantages.' Mark it as not spam.",
      "In that email you'll also see a number of other free things we can do to help you make more money. Let me take just a minute to explain each.",
    ],
    capture: ["contact_email", "amateur_endorsement_sent"],
    checklist: [
      "Verify the email back to them character by character",
      "Tick 'AE Sent' below as soon as you click Send",
      "Use the 'First Contact — Amateur Endorsement' template in the Email tab",
    ],
    decisions: [
      { label: "They're open → Pitch the Games", goto: "games", variant: "primary" },
      { label: "Maybe / need to think", goto: "follow_up" },
      { label: "Objection raised", goto: "objections" },
    ],
  },
  {
    slug: "games",
    number: 5,
    emoji: "⛳",
    title: "Step 5 — On-Course Games Pitch",
    subtitle: "Par 3 (Dixon Challenge) + Par 5 (Aurelius Challenge). End with the close.",
    callout: {
      tone: "warn",
      text: "A closing phrase MUST be used. Don't end the pitch without asking for the close directly.",
    },
    scriptLines: [
      "On the day of your event we'll send two reps. One sets up a fun game on a par 3, the other on a par 5.",
      "Par 3 — Dixon Challenge: every player gets a free gift. Donors get $150+ in prizes — $40 off Dixon, year of Golf Digest. Winners get extra prizes. We're witnesses for the free Fiesta Bowl Hole-in-One.",
      "Par 5 — Aurelius Challenge: we provide a custom driver OR $500 watch for inviting us out. Donors get $250+ in prizes — $100 off a club. Winners can win additional prizes.",
      "Best of all, this is 100% free of charge. Reps accept $10–$25 donations on the course. We mail you a check — 30% of gross.",
      "So first, let's confirm our support and schedule the reps, and second, let's get an address for those checks. Can I go ahead and schedule the reps? And what's the best address for the checks?",
    ],
    capture: ["interest_par3", "interest_par5"],
    decisions: [
      { label: "YES → Booking & Close", goto: "booking", variant: "primary" },
      { label: "Pace-of-play concern", goto: "objections" },
      { label: "Need to check with committee", goto: "objections" },
      { label: "Not interested → Auction Referral", goto: "auction" },
    ],
  },
  {
    slug: "booking",
    number: 6,
    emoji: "✅",
    title: "Step 6 — Booking & Close",
    subtitle: "Capture address, mark booked, send confirmation email.",
    callout: {
      tone: "warn",
      text: "SAVE all changes before creating CGT. Do not skip this step.",
    },
    scriptLines: [
      "Great — I'll send an email shortly with all the details about the on-course games. We'll triple-check everything to make sure we're at the right place, right time, with the right number of products and prizes — so you'll get a call from a manager and/or the reps as it gets closer.",
    ],
    capture: ["check_payable_to", "check_mail_to", "check_address", "event_time", "par3_booked", "par5_booked"],
    checklist: [
      "Tick Par 3 and/or Par 5 Booked below",
      "Set Stage to 'Challenges Booked'",
      "Send the 'Call Follow-Up (Booked)' email from the Email tab",
    ],
    decisions: [
      { label: "Booked → Pitch CGT", goto: "cgt", variant: "primary", patch: { stage: "challenges_booked" } },
    ],
  },
  {
    slug: "cgt",
    number: 7,
    emoji: "💻",
    title: "Step 7 — Charity Golf Today (CGT)",
    subtitle: "Are they at a computer? If yes, walk them through live.",
    scriptLines: [
      "Now — are you in front of a computer?",
      "[If YES] We also give you our tournament management platform — Charity Golf Today — completely free. Event website, registrations, payments, sponsor pages, pairings, live scoring. Only cost is 5% platform + 2.5% on payments processed.",
      "[If NO] OK, when you're in front of your computer I'd like to show you a free tool that'll save you an incredible amount of time and make your tournament more money. When would be a good time to talk?",
    ],
    callout: {
      tone: "warn",
      text: "URL Rule: Always edit the auto-generated URL to be clean and professional. It CANNOT be changed after creation.",
    },
    capture: ["cgt_created", "cgt_url"],
    checklist: [
      "Verify primary contact name & email (they receive login credentials)",
      "Verify entry fee is accurate",
      "Clean up the proposed URL (remove special chars, abbreviations)",
      "Tick 'CGT Created' and paste the URL below",
    ],
    decisions: [
      { label: "Walked through live → Custom Products", goto: "products", variant: "primary", patch: { stage: "cgt_created" } },
      { label: "Not at computer → schedule walkthrough", goto: "follow_up" },
    ],
  },
  {
    slug: "products",
    number: 9,
    emoji: "🛍️",
    title: "Step 9 — Custom Products",
    subtitle: "Sponsor-funded SWAG = profit for them, brand for sponsor, gifts for players.",
    scriptLines: [
      "All the best tournaments do this to make more revenue: custom products and sponsorships. To make the event great, you want a lot of stuff just for showing up — balls, shirts, towels.",
      "The great thing is, you can usually find a business to sponsor the products. A financial planner might pay $1,000 for the golf-ball sponsorship. You buy logoed balls from us for under $500 and give them to players. Players happy, sponsor happy, you pocket $500.",
      "Because you're working with me, I can get you wholesale pricing on hundreds of tournament-specific products, prizes, and even hole-in-one insurance. Buy 2+ products and we throw in free tote bags for your tournament.",
    ],
    capture: ["custom_products_sold"],
    decisions: [
      { label: "Interested → Consulting Close", goto: "consult", variant: "primary" },
      { label: "Pass for now → Consulting Close", goto: "consult" },
    ],
  },
  {
    slug: "consult",
    number: 10,
    emoji: "🤝",
    title: "Step 10 — Consulting Close",
    subtitle: "Position yourself as their teammate, not a vendor.",
    scriptLines: [
      "I've shown you valuable tools, but perhaps the most valuable tool I can offer is myself. I want to make your tournament a success — we've done it for tens of thousands. I want to be part of your team and share that knowledge.",
      "The only way I make money is when you buy stuff in the Event Products tool. You don't have to, but you do get wholesale pricing and I'd like you to take advantage of it.",
      "When we hang up I'll send you an email so you have my contact info. Reach out whenever, and I'll reach out as we get closer to make sure everything goes smoothly. Any questions?",
    ],
    checklist: ["Send the booked-call follow-up email from the Email tab"],
    decisions: [
      { label: "Done → Wrap-Up", goto: "wrap", variant: "primary" },
    ],
  },
  {
    slug: "auction",
    number: 11,
    emoji: "🏦",
    title: "Step 11 — Auction Referral (Situational)",
    subtitle: "Use when event is far out, canceled, or they declined the games.",
    scriptLines: [
      "I get it — the on-course piece isn't a fit. We have a sister offering on the auction side that helps tournaments raise money virtually. Want me to make the intro?",
    ],
    capture: ["auction_referred"],
    decisions: [
      { label: "Referred → Wrap-Up", goto: "wrap", variant: "primary" },
      { label: "Pass → Schedule follow-up", goto: "follow_up" },
    ],
  },
  {
    slug: "follow_up",
    number: 12,
    emoji: "📅",
    title: "Step 12 — Schedule Follow-Up",
    subtitle: "Only for real connections. Not for voicemails.",
    scriptLines: [
      "When's the best time for me to call you back so we can pick this up?",
    ],
    checklist: [
      "Use the 'Schedule follow-up' fieldset on the capture page",
      "Set Stage to 'Follow-Up Scheduled' or 'Call Back Needed'",
      "Write the 'Where We Left Off' note so future-you starts in context",
    ],
    capture: ["where_left_off"],
    decisions: [
      { label: "Done → Wrap-Up", goto: "wrap", variant: "primary", patch: { stage: "follow_up_scheduled" } },
    ],
  },
  {
    slug: "wrap",
    number: 13,
    emoji: "🧾",
    title: "Step 13 — Wrap-Up Checklist",
    subtitle: "Before you click Log Call, complete every item.",
    callout: {
      tone: "info",
      text: "This is the difference between a CRM that helps and one that rots. 60 seconds now saves an hour next week.",
    },
    checklist: [
      "Stage is set correctly",
      "'Where We Left Off' is filled in (one sentence, your callback brief)",
      "All booked offers are ticked",
      "Check address captured if applicable",
      "DB Note Line generated and copied to Dixon database",
      "Follow-up scheduled if there's a next step",
    ],
    capture: ["where_left_off"],
    decisions: [
      { label: "All clear → Log Call", goto: "wrap", variant: "primary" },
    ],
  },
];

export const STEP_BY_SLUG = Object.fromEntries(PIPELINE_STEPS.map((s) => [s.slug, s]));

/* ---------------- Objection Quick-Reference ---------------- */

export type Objection = {
  slug: string;
  trigger: string;
  response: string;
  tip?: string;
};

export const OBJECTIONS: Objection[] = [
  {
    slug: "whats_the_catch",
    trigger: "What's the catch? / Sounds too good to be true.",
    response:
      "Honest answer — there's no catch on the free pieces. We're a marketing-driven company. We get in front of golfers at your event, you get prizes, fundraising help, and 30% of donations back. The only thing we sell is the optional custom products at wholesale, and only if you want them.",
  },
  {
    slug: "pace_of_play",
    trigger: "I'm worried about pace of play.",
    response:
      "Totally fair concern. Our reps are trained to keep groups moving — the games are fast (one shot), and we set up to the side of the tee so we never block play. We've run this on 60,000+ tournaments without slowing rounds down.",
  },
  {
    slug: "committee",
    trigger: "I have to check with my committee.",
    response:
      "Absolutely — let's get you the info to bring to them. I'll send the call email now with everything in writing, and let's pencil in a callback right after your committee meeting so we can lock the date before another tournament books our reps for that day. When's the meeting?",
    tip: "Always set the follow-up date on the call. Do not 'wait to hear back.'",
  },
  {
    slug: "we_have_sponsors",
    trigger: "We already have sponsors / hole sponsors.",
    response:
      "Great — this isn't a hole sponsorship, it's a fundraising activation. Our reps fund themselves through optional donations and we mail you a check. It stacks on top of what your sponsors are already doing.",
  },
  {
    slug: "send_info",
    trigger: "Just send me some info and I'll review it.",
    response:
      "Happy to. I'll send the Amateur Endorsement and an overview right now — what's the best email? While I have you, can I ask one quick question so I send the right info: [pick one Discovery question].",
    tip: "Never accept 'send me info' as the end of the call. Re-open Discovery.",
  },
  {
    slug: "not_interested",
    trigger: "Not interested.",
    response:
      "No problem at all — can I ask, is it the timing, the games themselves, or just bandwidth right now? That way I know whether to reach back out next year.",
    tip: "Their answer tells you whether to mark Closed Lost or Follow-Up Next Cycle.",
  },
  {
    slug: "small_event",
    trigger: "Our event is too small for this.",
    response:
      "There's no minimum — we work with 40-player events all the way up to 300+. The math actually works better for smaller tournaments because the per-player attention is higher.",
  },
];
