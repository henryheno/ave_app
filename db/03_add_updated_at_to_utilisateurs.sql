-- 03_add_updated_at_to_utilisateurs.sql
-- Migration to add updated_at column to public.utilisateurs
-- This column stores the timestamp of the last update for a user profile.

ALTER TABLE public.utilisateurs
ADD COLUMN updated_at timestamp with time zone NULL DEFAULT now();
