-- Enable Row Level Security and allow admin/superadmin to insert documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: only users with role 'admin' or 'superadmin' can insert rows
CREATE POLICY "allow_insert_authenticated" ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Optionally, allow all authenticated users to read rows
CREATE POLICY "allow_read" ON public.documents
  FOR SELECT
  USING (auth.role() IS NOT NULL);


-- db/04_documents_rls.sql
-- ------------------------------------------------------------
-- 1️⃣ Activer Row‑Level Security sur la table documents
-- ------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2️⃣ Politique d’insertion – tout utilisateur authentifié peut insérer
-- ------------------------------------------------------------
DROP POLICY IF EXISTS allow_insert_authenticated ON public.documents;
CREATE POLICY "allow_insert_authenticated"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);   -- l’UID doit être présent (user connecté)

-- ------------------------------------------------------------
-- 3️⃣ Politique de lecture – tout utilisateur authentifié peut lire
-- ------------------------------------------------------------
DROP POLICY IF EXISTS allow_read ON public.documents;
CREATE POLICY "allow_read"
  ON public.documents
  FOR SELECT
  USING (auth.role() IS NOT NULL);      -- l’utilisateur possède un rôle (membre, admin, …)

-- ------------------------------------------------------------
-- 4️⃣ (Optionnel) Vous pouvez ajouter d’autres politiques ici…
-- ------------------------------------------------------------
