
CREATE TABLE public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_google_tokens_select" ON public.google_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_google_tokens_insert" ON public.google_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_google_tokens_update" ON public.google_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_google_tokens_delete" ON public.google_tokens
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_google_tokens_updated_at
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
