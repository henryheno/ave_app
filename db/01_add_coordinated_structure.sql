-- Ajouter la colonne pour la structure coordonnée dans la table profiles
ALTER TABLE public.profiles
ADD COLUMN coordinated_structure_id uuid NULL,
ADD CONSTRAINT profiles_coordinated_structure_id_fkey 
    FOREIGN KEY (coordinated_structure_id) 
    REFERENCES public.structures (id) 
    ON DELETE SET NULL;

-- Créer un index pour optimiser les requêtes sur cette colonne
CREATE INDEX IF NOT EXISTS idx_profiles_coordinated_structure ON public.profiles USING btree (coordinated_structure_id) TABLESPACE pg_default;
