
-- Discovery / qualification fields for the live call workspace
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS decision_maker TEXT, -- 'yes' | 'no' | 'maybe'
  ADD COLUMN IF NOT EXISTS registration_time TEXT,
  ADD COLUMN IF NOT EXISTS tee_off_time TEXT,
  -- Background
  ADD COLUMN IF NOT EXISTS is_annual_event BOOLEAN,
  ADD COLUMN IF NOT EXISTS years_running INTEGER,
  ADD COLUMN IF NOT EXISTS org_age_years INTEGER,
  ADD COLUMN IF NOT EXISTS contact_years_involved INTEGER,
  ADD COLUMN IF NOT EXISTS contact_years_in_charge INTEGER,
  ADD COLUMN IF NOT EXISTS contact_how_involved TEXT,
  ADD COLUMN IF NOT EXISTS funds_use_type TEXT, -- 'specific' | 'general'
  ADD COLUMN IF NOT EXISTS funds_use_notes TEXT,
  ADD COLUMN IF NOT EXISTS overall_goal TEXT,
  -- Event flow
  ADD COLUMN IF NOT EXISTS registration_opens_at TEXT,
  ADD COLUMN IF NOT EXISTS registration_sales TEXT,
  ADD COLUMN IF NOT EXISTS course_games TEXT,
  ADD COLUMN IF NOT EXISTS extra_donation_games BOOLEAN,
  ADD COLUMN IF NOT EXISTS extra_donation_notes TEXT,
  ADD COLUMN IF NOT EXISTS post_round_activities TEXT,
  ADD COLUMN IF NOT EXISTS extra_fundraising TEXT,
  -- Revenue / sponsorship
  ADD COLUMN IF NOT EXISTS revenue_sources TEXT[], -- multi-select chips
  ADD COLUMN IF NOT EXISTS prize_donor_lead TEXT,
  ADD COLUMN IF NOT EXISTS prize_types TEXT,
  ADD COLUMN IF NOT EXISTS payment_processor_notes TEXT,
  ADD COLUMN IF NOT EXISTS has_player_gift_budget TEXT, -- 'yes' | 'no' | 'maybe'
  ADD COLUMN IF NOT EXISTS player_gift_items TEXT,
  -- Pain & fit
  ADD COLUMN IF NOT EXISTS hardest_part TEXT,
  ADD COLUMN IF NOT EXISTS pain_point_chips TEXT[],
  ADD COLUMN IF NOT EXISTS opportunity_flags TEXT[],
  ADD COLUMN IF NOT EXISTS objections TEXT;
