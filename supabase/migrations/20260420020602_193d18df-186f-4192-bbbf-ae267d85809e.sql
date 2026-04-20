-- Create the public bucket for offer PDFs
insert into storage.buckets (id, name, public)
values ('offer-pdfs', 'offer-pdfs', true)
on conflict (id) do update set public = true;

-- Public read access (PDFs are meant to be shareable via email)
create policy "Offer PDFs are publicly readable"
on storage.objects
for select
using (bucket_id = 'offer-pdfs');

-- Authenticated users can upload into their own folder (path starts with their user id)
create policy "Users can upload their own offer PDFs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-pdfs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own offer PDFs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'offer-pdfs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own offer PDFs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'offer-pdfs'
  and auth.uid()::text = (storage.foldername(name))[1]
);