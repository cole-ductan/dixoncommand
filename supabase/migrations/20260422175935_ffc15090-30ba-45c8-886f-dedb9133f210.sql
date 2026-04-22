-- Create note_folders table
CREATE TABLE public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_note_folders_select" ON public.note_folders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_note_folders_insert" ON public.note_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_note_folders_update" ON public.note_folders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_note_folders_delete" ON public.note_folders
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_note_folders_updated_at
BEFORE UPDATE ON public.note_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id column to notes (nullable = uncategorized)
ALTER TABLE public.notes ADD COLUMN folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);