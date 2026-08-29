-- 1) Fonction de synchronisation des nouveaux utilisateurs Supabase
CREATE OR REPLACE FUNCTION public.sync_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.utilisateurs (id, nom, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nom', 'Utilisateur'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'membre')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    id,
    nom,
    prenom,
    sexe,
    telephone,
    date_naissance,
    branche,
    fonction,
    comi_id,
    avatar_url
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nom', 'Utilisateur'),
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'sexe',
    new.phone,
    NULLIF(new.raw_user_meta_data->>'date_naissance', '')::date,
    (LOWER(NULLIF(new.raw_user_meta_data->>'branche', '')))::public.membre_branche,
    new.raw_user_meta_data->>'fonction',
    NULLIF(new.raw_user_meta_data->>'comi_id', '')::uuid,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Trigger sur auth.users
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user();

-- 3) Activer RLS sur publications
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- 4) Lecture publique
DROP POLICY IF EXISTS "Voir toutes les publications" ON public.publications;
CREATE POLICY "Voir toutes les publications"
ON public.publications
FOR SELECT
USING (true);

-- 5) INSERT pour admin
DROP POLICY IF EXISTS "Admin peut publier partout" ON public.publications;
CREATE POLICY "Admin peut publier partout"
ON public.publications
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- 6) INSERT pour coordonnateur dans sa structure
DROP POLICY IF EXISTS "Coordonateur publie dans sa structure" ON public.publications;
CREATE POLICY "Coordonateur publie dans sa structure"
ON public.publications
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'coordonateur'
      AND p.comi_id = structure_id
  )
);

-- 7) UPDATE pour admin
DROP POLICY IF EXISTS "Admin peut modifier toutes les publications" ON public.publications;
CREATE POLICY "Admin peut modifier toutes les publications"
ON public.publications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- 8) UPDATE pour coordonnateur
DROP POLICY IF EXISTS "Coordonateur modifie ses publications dans sa structure" ON public.publications;
CREATE POLICY "Coordonateur modifie ses publications dans sa structure"
ON public.publications
FOR UPDATE
USING (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'coordonateur'
      AND p.comi_id = structure_id
  )
);

-- 9) DELETE pour admin
DROP POLICY IF EXISTS "Admin peut supprimer toutes les publications" ON public.publications;
CREATE POLICY "Admin peut supprimer toutes les publications"
ON public.publications
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- 10) DELETE pour coordonnateur
DROP POLICY IF EXISTS "Coordonateur supprime ses publications dans sa structure" ON public.publications;
CREATE POLICY "Coordonateur supprime ses publications dans sa structure"
ON public.publications
FOR DELETE
USING (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1
    FROM public.utilisateurs u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'coordonateur'
      AND p.comi_id = structure_id
  )
);


alter table public.comments enable row level security;

create policy "Select comments for authenticated users"
  on public.comments
  for select
  using (auth.uid() IS NOT NULL);

create policy "Insert comments for authenticated users"
  on public.comments
  for insert
  with check (auth.uid() IS NOT NULL);

create policy "Update own or admin comments"
  on public.comments
  for update
  using (
    auth.uid() = user_id
    OR exists (
      select 1
      from public.utilisateurs u
      where u.id = auth.uid()
        and u.role in ('admin', 'superadmin')
    )
  );

create policy "Delete own or admin comments"
  on public.comments
  for delete
  using (
    auth.uid() = user_id
    OR exists (
      select 1
      from public.utilisateurs u
      where u.id = auth.uid()
        and u.role in ('admin', 'superadmin')
    )
  );