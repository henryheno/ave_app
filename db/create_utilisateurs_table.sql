-- Assure la présence de la table utilisateurs avec le bon schéma et les rôles attendus
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nom text NULL,
  email text NULL,
  role text NOT NULL DEFAULT 'membre' CHECK (role IN ('membre', 'admin', 'coordonateur')),
  created_at timestamptz DEFAULT now()
);
