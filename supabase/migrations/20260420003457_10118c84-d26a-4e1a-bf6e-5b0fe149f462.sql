-- Add expanded_details to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS expanded_details TEXT;

-- Offer PDFs table
CREATE TABLE IF NOT EXISTS public.offer_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  drive_file_id TEXT,
  drive_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_offer_pdfs_select" ON public.offer_pdfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_offer_pdfs_insert" ON public.offer_pdfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_offer_pdfs_update" ON public.offer_pdfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_offer_pdfs_delete" ON public.offer_pdfs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_offer_pdfs_updated_at
BEFORE UPDATE ON public.offer_pdfs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_offer_pdfs_user_slug ON public.offer_pdfs(user_id, offer_slug);