-- 1. Storage bucket for offer PDFs (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-pdfs', 'offer-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read; only authenticated users can upload/manage their own folder
CREATE POLICY "offer_pdfs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-pdfs');

CREATE POLICY "offer_pdfs_user_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'offer-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "offer_pdfs_user_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'offer-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "offer_pdfs_user_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'offer-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Add storage_path + public_url to offer_pdfs
ALTER TABLE public.offer_pdfs
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS public_url text;

-- 3. Notes table - global scratchpad notes (not tied to a lead)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  reminder_at TIMESTAMP WITH TIME ZONE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notes_select" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_notes_insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_notes_update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_notes_delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_reminder ON public.notes(user_id, reminder_at) WHERE reminder_at IS NOT NULL;

-- 4. Next-action presets, editable per user from Playbook
CREATE TABLE IF NOT EXISTS public.next_action_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, label)
);

ALTER TABLE public.next_action_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_presets_select" ON public.next_action_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_presets_insert" ON public.next_action_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_presets_update" ON public.next_action_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_presets_delete" ON public.next_action_presets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON public.next_action_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default presets for existing users
INSERT INTO public.next_action_presets (user_id, label, sort_order)
SELECT u.id, p.label, p.sort_order
FROM auth.users u
CROSS JOIN (VALUES
  ('Send Amateur Endorsement email', 1),
  ('Send CGT walkthrough', 2),
  ('Confirm Par 3 booking', 3),
  ('Confirm Par 5 booking', 4),
  ('Schedule check-in call', 5),
  ('Send proposal', 6),
  ('Send invoice / check info', 7),
  ('Send custom products quote', 8),
  ('Follow-up call', 9),
  ('Send sponsorship packages', 10)
) AS p(label, sort_order)
ON CONFLICT (user_id, label) DO NOTHING;

-- Auto-seed presets for new users via the existing seed trigger pattern
CREATE OR REPLACE FUNCTION public.seed_next_action_presets_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.next_action_presets (user_id, label, sort_order) VALUES
    (NEW.id, 'Send Amateur Endorsement email', 1),
    (NEW.id, 'Send CGT walkthrough', 2),
    (NEW.id, 'Confirm Par 3 booking', 3),
    (NEW.id, 'Confirm Par 5 booking', 4),
    (NEW.id, 'Schedule check-in call', 5),
    (NEW.id, 'Send proposal', 6),
    (NEW.id, 'Send invoice / check info', 7),
    (NEW.id, 'Send custom products quote', 8),
    (NEW.id, 'Follow-up call', 9),
    (NEW.id, 'Send sponsorship packages', 10)
  ON CONFLICT (user_id, label) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed_presets ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_presets
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_next_action_presets_for_user();