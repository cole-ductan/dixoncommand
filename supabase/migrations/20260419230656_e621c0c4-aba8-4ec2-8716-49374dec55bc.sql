-- 1. Add 'proposal_sent' to pipeline_stage enum (between cgt_created and follow_up_scheduled)
ALTER TYPE public.pipeline_stage ADD VALUE 'proposal_sent' BEFORE 'follow_up_scheduled';

-- 2. CM Schedules table (weekly shifts)
CREATE TABLE public.cm_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL, -- Friday of that week (week runs Fri–Thu)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon..6=Sun
  shift1_start TIME,
  shift1_end TIME,
  shift2_start TIME,
  shift2_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, day_of_week)
);

ALTER TABLE public.cm_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_cm_select" ON public.cm_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_cm_insert" ON public.cm_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_cm_update" ON public.cm_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_cm_delete" ON public.cm_schedules FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_cm_schedules_updated
BEFORE UPDATE ON public.cm_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Point activity enum + Point Logs table
CREATE TYPE public.point_activity AS ENUM (
  'par3_booked_with_poc',
  'poc_watched_sponsorship_video',
  'poc_watched_pricing_video',
  'poc_watched_swag_video',
  'cgt_ta_appointment_booked',
  'auction_referred',
  'event_worked_as_rep'
);

CREATE TABLE public.point_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity public.point_activity NOT NULL,
  points SMALLINT NOT NULL CHECK (points >= 0 AND points <= 10),
  notes TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_point_logs_user_date ON public.point_logs (user_id, log_date DESC);

ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_points_select" ON public.point_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_points_insert" ON public.point_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_points_update" ON public.point_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_points_delete" ON public.point_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_point_logs_updated
BEFORE UPDATE ON public.point_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Weekly Goals table (closing goals history)
CREATE TABLE public.weekly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL, -- Friday of that week
  goal INTEGER NOT NULL DEFAULT 0 CHECK (goal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_goals_select" ON public.weekly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_goals_insert" ON public.weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_goals_update" ON public.weekly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_goals_delete" ON public.weekly_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_weekly_goals_updated
BEFORE UPDATE ON public.weekly_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add lead_source to events for the new Add Lead field
ALTER TABLE public.events ADD COLUMN lead_source TEXT;