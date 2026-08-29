-- Migration: Create Coordinator Forum Messages Table

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.coordon_forum_messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.coordon_forum_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Lecture : Tous les utilisateurs ayant le rôle 'coordonateur', 'admin' ou 'superadmin' peuvent lire
CREATE POLICY "Les coordonnateurs peuvent lire les messages du forum"
ON public.coordon_forum_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid() AND u.role IN ('coordonateur', 'admin', 'superadmin')
    )
);

-- Écriture : Seuls les coordonnateurs, admins et superadmins peuvent écrire
CREATE POLICY "Les coordonnateurs peuvent écrire des messages"
ON public.coordon_forum_messages
FOR INSERT
WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid() AND u.role IN ('coordonateur', 'admin', 'superadmin')
    )
);

-- Modification : Optionnel, un utilisateur peut modifier son propre message s'il le souhaite
CREATE POLICY "Les auteurs peuvent modifier leurs propres messages"
ON public.coordon_forum_messages
FOR UPDATE
USING (auth.uid() = author_id);

-- Suppression : Optionnel, un auteur peut supprimer son message
CREATE POLICY "Les auteurs peuvent supprimer leurs propres messages"
ON public.coordon_forum_messages
FOR DELETE
USING (auth.uid() = author_id);
