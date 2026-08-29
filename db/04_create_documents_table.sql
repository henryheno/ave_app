create table public.documents (
  id uuid not null default gen_random_uuid (),
  name text not null,
  content text,               -- texte extrait du fichier (optionnel), nullable
  file_url text,              -- URL du fichier stocké dans Supabase Storage
  file_type text,             -- mime type du fichier (pdf, docx, etc.)
  page_count integer not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint documents_pkey primary key (id),
  constraint documents_page_count_check check ((page_count > 0))
) tablespace pg_default;

create index if not exists documents_page_count_idx on public.documents using btree (page_count) tablespace pg_default;

create trigger set_documents_updated_at before update on documents for each row execute function set_updated_at ();
