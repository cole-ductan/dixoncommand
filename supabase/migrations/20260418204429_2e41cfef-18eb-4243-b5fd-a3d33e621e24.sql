-- Pipeline stages enum
CREATE TYPE public.pipeline_stage AS ENUM (
  'new_lead','contacted','left_voicemail','call_back_needed','pitch_delivered',
  'challenges_booked','cgt_created','follow_up_scheduled','closed_won','closed_lost'
);

CREATE TYPE public.task_status AS ENUM ('pending','done','snoozed');
CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.call_outcome AS ENUM ('connected','voicemail','no_answer','wrong_number','not_interested','booked','follow_up');

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cause TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_orgs_select" ON public.organizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_orgs_insert" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_orgs_update" ON public.organizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_orgs_delete" ON public.organizations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_contacts_select" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_contacts_insert" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_contacts_update" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_contacts_delete" ON public.contacts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_date DATE,
  event_time TEXT,
  course TEXT,
  territory TEXT,
  dixon_tournament_id TEXT,
  player_count INT,
  entry_fee NUMERIC,
  sponsorship_details TEXT,
  registration_method TEXT,
  player_gift_budget TEXT,
  pain_points TEXT,
  funds_use TEXT,
  event_website TEXT,
  interest_par3 BOOLEAN NOT NULL DEFAULT false,
  interest_par5 BOOLEAN NOT NULL DEFAULT false,
  interest_cgt BOOLEAN NOT NULL DEFAULT false,
  interest_custom_products BOOLEAN NOT NULL DEFAULT false,
  interest_auction BOOLEAN NOT NULL DEFAULT false,
  interest_amateur_endorsement BOOLEAN NOT NULL DEFAULT false,
  amateur_endorsement_sent BOOLEAN NOT NULL DEFAULT false,
  par3_booked BOOLEAN NOT NULL DEFAULT false,
  par5_booked BOOLEAN NOT NULL DEFAULT false,
  cgt_created BOOLEAN NOT NULL DEFAULT false,
  cgt_url TEXT,
  custom_products_sold BOOLEAN NOT NULL DEFAULT false,
  auction_referred BOOLEAN NOT NULL DEFAULT false,
  check_payable_to TEXT,
  check_mail_to TEXT,
  check_address TEXT,
  stage public.pipeline_stage NOT NULL DEFAULT 'new_lead',
  hot_lead BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  where_left_off TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_events_select" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_events_update" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_events_delete" ON public.events FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_events_user_stage ON public.events(user_id, stage);
CREATE INDEX idx_events_user_date ON public.events(user_id, event_date);

CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  call_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_type TEXT,
  outcome public.call_outcome,
  summary TEXT,
  db_note_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_calls_select" ON public.calls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_calls_insert" ON public.calls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_calls_update" ON public.calls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_calls_delete" ON public.calls FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER calls_updated BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_calls_event ON public.calls(event_id, call_date DESC);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  next_action TEXT NOT NULL,
  next_action_at TIMESTAMPTZ NOT NULL,
  priority public.task_priority NOT NULL DEFAULT 'normal',
  status public.task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tasks_select" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_tasks_update" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_tasks_delete" ON public.tasks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_user_when ON public.tasks(user_id, next_action_at) WHERE status = 'pending';

CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  template_used TEXT,
  subject TEXT,
  body TEXT,
  sent_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_emails_select" ON public.emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_emails_insert" ON public.emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_emails_update" ON public.emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_emails_delete" ON public.emails FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER emails_updated BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.script_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
ALTER TABLE public.script_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_script_select" ON public.script_sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_script_insert" ON public.script_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_script_update" ON public.script_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_script_delete" ON public.script_sections FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER script_updated BEFORE UPDATE ON public.script_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  cost TEXT,
  when_to_introduce TEXT,
  details TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_offers_select" ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_offers_insert" ON public.offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_offers_update" ON public.offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_offers_delete" ON public.offers FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tmpl_select" ON public.email_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_tmpl_insert" ON public.email_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_tmpl_update" ON public.email_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_tmpl_delete" ON public.email_templates FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER tmpl_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-seed Dixon content for every new auth user
CREATE OR REPLACE FUNCTION public.seed_dixon_content_for_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.script_sections (user_id, slug, title, body, sort_order) VALUES
  (NEW.id, 'voicemail', 'Step 1 — Voicemail', E'DO NOT mention "Dixon Golf" in the voicemail.\n\n"Hi, this is [YOUR NAME]. I was calling about your [TOURNAMENT NAME] golf tournament. I was interested in donating an item to the raffle or sponsoring your event, but wanted to hear a little more about it. If you could give me a call back that would be great. My number is [YOUR PHONE]."\n\nWhy: They call back out of curiosity, not because they think it''s a corporate sales call.', 1),
  (NEW.id, 'intro', 'Step 2 — Live Introduction', '"Hi, this is [YOUR NAME] from Dixon Golf. We sponsor a number of charity golf events as part of our marketing. We heard about your upcoming event and I wanted to see if it''s something we want to sponsor. Could you tell me a bit about your event?"', 2),
  (NEW.id, 'questions', 'Step 3 — Ask Questions (MOST IMPORTANT)', E'Let them talk. The more they talk, the more they like you.\n\nKey questions:\n• Specific use for the funds, or general?\n• How many years have you done it?\n• How long have you been involved?\n• Date and time of the tournament?\n• Which golf course?\n• Entry fee?\n• How many players?\n• Current sponsorships?\n• Registration / payment process?\n• Player gift budget?\n• Hardest part of running the event?\n• Overall goal this year — $X raised, X golfers, etc.?', 3),
  (NEW.id, 'amateur_endorsement', 'Step 4 — Offer Free Stuff (Amateur Endorsement)', E'"Great, we can certainly support what you are doing by sending you an Amateur Endorsement. The Amateur Endorsement is a prize for you to give to a player at your event. That individual will be sponsored by Dixon Golf, get a free hat, free golf balls, free divot tool, and discounts for a whole year — a $50 value.\n\nWhat is your email address so that I can email you the prize redemption certificate?"\n\n[Get email, verify it, click Send Call Email]\n\n"It contains the word ''FREE'' a few times so it will most likely be in your spam folder. Subject is ''Dixon Advantages.'' Mark it as not spam."', 4),
  (NEW.id, 'on_course_games', 'Step 5 — On-Course Games', E'"We''ll send two reps. One sets up a fun game on a par 3, the other on a par 5."\n\nPAR 3 (Dixon Challenge):\nFree gift for every player. Donors get $150+ in prizes — $40 off Dixon, year of Golf Digest. Winners get extra prizes. Includes free Fiesta Bowl Hole-in-One opportunity.\n\nPAR 5 (Aurelius Challenge):\nCustom driver OR $500 watch raffled to event for inviting us. Donors get $250+ in prizes — $100 off a club. Winners hit a hula hoop to win.\n\nCLOSE:\n"100% free of charge. Reps accept $10–$25 donations on course. We mail you a check for 30% of gross."', 5),
  (NEW.id, 'cgt', 'Step 6 — CGT Platform Pitch', E'"We also give you our tournament management platform — Charity Golf Today — completely free. Event website, registrations, payments, sponsor pages, pairings, live scoring. Only cost is 5% + 2.5% on payments processed."\n\nTrigger: They mention registration, website, payments, sponsors, or logistics.', 6),
  (NEW.id, 'custom_products', 'Step 7 — Custom Products', E'"If you have any budget for player gifts or sponsor packages, we have a wholesale store with logoed balls, polos, towels, divot tools — and incentives:\n• Buy 1 → free $1000 HIO Privilege Travel card\n• Buy 2 → free tote bag for all players\n• Buy 3 Lifetime HIO prizes → 4th HIO free"', 7),
  (NEW.id, 'close', 'Step 8 — Close / Next Step', E'Lock in commitment:\n• Confirm Par 3 / Par 5 booking\n• Confirm CGT created or walkthrough scheduled\n• Get check payable info & mailing address\n• Set Next Follow-Up date and reason\n• Send the follow-up email before you hang up\n\nUpdate Stage and "Where We Left Off" so the next call starts in context.', 8);

  INSERT INTO public.offers (user_id, slug, name, type, cost, when_to_introduce, details, sort_order) VALUES
  (NEW.id, 'amateur_endorsement', 'Amateur Endorsement', 'Free prize certificate', 'Free', 'Immediately after Discovery — always',
E'Free prize certificate the tournament gives to one player.\n• Dixon Bamboo Hat\n• Sleeve of Dixon Earth golf balls\n• Zinc alloy divot tool & ball marker\n• 50% off Dixon Golf gear for 1 year\n• Possible social media spotlight\nStated value: $50. Redeem at dixongolf.com/amateur.', 1),
  (NEW.id, 'dixon_challenge', 'Dixon Challenge (Par 3)', 'On-course fundraising game', 'Free', 'After Amateur Endorsement — always',
E'Dixon rep runs a fun game on a par 3. Free gift for every player. Donors get $150+ in prizes ($40 off Dixon, Golf Digest membership). Free Fiesta Bowl HIO included. 30% of gross donations mailed back as a check.', 2),
  (NEW.id, 'aurelius_challenge', 'Aurelius Challenge (Par 5)', 'On-course fundraising game', 'Free', 'Pitched together with Dixon Challenge',
E'Dixon rep runs a fun game on a par 5. Charity gets a custom driver OR $500 Zovatti watch. Donors get $250+ in prizes ($100 off a club). 30% of gross donations mailed back as a check.', 3),
  (NEW.id, 'fiesta_bowl', 'Fiesta Bowl Hole-in-One', 'Bonus contest with Dixon Challenge', 'Free', 'Mentioned during Dixon Challenge pitch',
E'Bonus included with Dixon Challenge. Holes-in-one earn direct access to the final round of the Million Dollar Fiesta Bowl Shootout.', 4),
  (NEW.id, 'legend_shootout', 'LEGEND Shootout', 'Raffle-based hole-in-one contest', 'Free', 'Situational — large or high-value events',
E'Raffle-style hole-in-one contest layered on top of standard offers for high-volume tournaments.', 5),
  (NEW.id, 'cgt', 'Charity Golf Today (CGT)', 'Tournament management platform', 'Free (5% + 2.5% on payments)', 'After booking — always',
E'Free tournament platform: event website, registrations, payments, pairings, sponsor pages, live scoring. Only fees are payment processing (5% + 2.5%). Pitch when they mention registration, payments, sponsors, or logistics.', 6),
  (NEW.id, 'custom_products', 'Custom Products', 'Branded tournament merchandise', 'Wholesale pricing', 'After CGT walkthrough',
E'Wholesale store: logoed balls, polos, towels, divot tools, more.\n• Buy 1 → free $1000 HIO Privilege Travel Card\n• Buy 2 → free tote for all players\n• Buy 3 lifetime HIO prizes → 4th free', 7),
  (NEW.id, 'sponsorship_packages', 'Sponsorship Packages', 'Ready-made sponsor tiers', 'Wholesale pricing', 'During CGT walkthrough — if they sell sponsorships',
E'Pre-built sponsor tier templates with custom-branded products.', 8),
  (NEW.id, 'hole_in_one_insurance', 'Hole-in-One Insurance', 'Prize insurance product', 'Wholesale pricing', 'After CGT — if they want big prizes',
E'Insurance product allowing the event to advertise high-value HIO prizes.', 9),
  (NEW.id, 'consulting', 'Consulting Support', 'TC as tournament advisor', 'Free', 'End of call — always',
E'Position yourself as their advisor. "I work with hundreds of tournaments, my company works with tens of thousands."', 10),
  (NEW.id, 'auction_referral', 'Auction Referral', 'Virtual fundraising partner referral', 'Free', 'Situational — canceled, far out, or declined games',
E'Referral to virtual fundraising partner. Use when the call is going cold or they declined the on-course games.', 11);

  INSERT INTO public.email_templates (user_id, slug, name, subject, body) VALUES
  (NEW.id, 'first_contact', 'First Contact — Amateur Endorsement', 'Dixon Advantages',
E'Hi {{contact_name}},\n\nHere is a brief overview of options that can be helpful for your tournament. You can choose ANY or ALL of them. I will discuss them in more detail on our phone call.\n\nFREE — Amateur Endorsement Package\nGive this prize to one of your players (balls, hat, divot tool, 50% discount at Dixon Golf for a year).\n\nFREE — On-Course Games\nWe staff two holes with fun games and give away prizes while providing additional fundraising.\n\nFREE — Tournament Planning Software\nBest tournament planning software in the industry at no charge.\n\nFREE — Educational Video Series\nBuilt from 60,000 tournaments worth of experience.\n\nOnline Store with Tournament Products\nPrizes, custom logo products, hole-in-one insurance, sponsor items at wholesale.\n\nFREE — Organizational Tools\nCommittee, registrations, pairings, check-in, live scoring.\n\nWebsite for Your Tournament\nA site just for your tournament that accepts payments.\n\nFREE — Expert Consulting\nI work with hundreds of golf tournaments. Happy to share what I''ve learned.\n\nTalk soon,\n{{your_name}}'),
  (NEW.id, 'follow_up', 'Call Follow-Up (Booked)', 'Dixon Golf at {{event_name}} — confirmation',
E'{{contact_name}},\n\nWe are excited about Dixon Golf being a part of your golf event at {{course}} on {{event_date}}. We will provide the staff, gear, and all the gifts/prizes to make sure our support makes your event a success.\n\nFREE Raffle Prize (Amateur Endorsement Package)\nSleeve of Dixon Earth golf balls ($12), Dixon hat ($30), divot tool & ball marker ($15), 50% discount on all Dixon Golf merchandise for a year.\n\nFREE Dixon Challenge (Par 3)\nLocal rep, free Bamboo Tees for players, $40 off Dixon + $100 off RedView Range Finder + 1-year Golf Digest for donors ($150 value), $10 store gift cards for green-finders, direct access to the Million Dollar Fiesta Bowl Shootout for HIOs. Optional $10–$25 donations. NO upfront cost. 30% of gross mailed by check.\n\nFREE Aurelius Challenge (Par 5)\nCustom driver OR $500 Zovatti watch for the charity to raffle. $100 off a hybrid/wedge + $150 watch certificate + raffle tickets for donors ($250 value). Hula-hoop landing wins the driver/watch. Optional $25–$40 donations. NO upfront cost. 30% of gross mailed by check.\n\nFREE Tournament Planning Tool (includes free website)\nSave time and increase profits.\n\nCustom Products & Sponsorship\nLogoed balls, polos, towels, divot tools.\n• Buy 1 → free $1000 HIO Privilege Travel Card\n• Buy 2 → free tote bag for all players\n• Buy 3 Lifetime HIO prizes → 4th HIO free\n\nPDFs: dixongolf.com/DixonIntro.pdf  (note: "net proceeds" = 30%)\nCustom products & insurance: dixongolf.com/customproducts.php\n\nTalk soon,\n{{your_name}}'),
  (NEW.id, 'no_answer', 'No Answer / Callback', 'Tried to reach you — {{event_name}}',
E'Hi {{contact_name}},\n\nTried calling about your {{event_name}} tournament — wanted to talk through a free sponsorship opportunity. I''ll try again {{next_action_at}}, or feel free to call me at [YOUR PHONE].\n\n— {{your_name}}'),
  (NEW.id, 'cgt_intro', 'CGT Intro', 'Your free tournament platform — {{event_name}}',
E'{{contact_name}},\n\nPer our call, here''s the link to set up your free Charity Golf Today site for {{event_name}}: {{cgt_url}}\n\nIt includes registrations, payments, sponsors, pairings, and a live scoring board — all at no cost (only payment processing fees apply). Let me know if you want to do a quick walkthrough together.\n\n— {{your_name}}');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_dixon_content_for_user();