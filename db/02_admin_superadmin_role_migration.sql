-- 02_admin_superadmin_role_migration.sql

-- ------------------------------------------------------------
-- Fonction RPC : update_user_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_target_user_id uuid,
    p_new_role       text,
    p_structure_id   uuid          -- NULL si on retire la coordination
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id   uuid := auth.uid();
    v_caller_role text;
BEGIN
    -- 1️⃣ Vérifier que l’appelant est admin / superadmin
    SELECT u.role INTO v_caller_role
    FROM public.utilisateurs u
    WHERE u.id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'superadmin') THEN
        RAISE EXCEPTION 'Permission refusée : seul un admin ou superadmin peut modifier les rôles';
    END IF;

    -- 2️⃣ Vérifier que le nouveau rôle est valide
    IF p_new_role NOT IN ('membre', 'admin', 'superadmin', 'coordonateur') THEN
        RAISE EXCEPTION 'Rôle invalide : %', p_new_role;
    END IF;

    -- 3️⃣ Mettre à jour le rôle dans `utilisateurs`
    UPDATE public.utilisateurs
    SET role = CASE
                 WHEN p_new_role = 'coordonateur'
                      AND role IN ('admin', 'superadmin')
                 THEN role                     -- conserver admin / superadmin
                 ELSE p_new_role
               END,
        updated_at = now()
    WHERE id = p_target_user_id;

    -- 4️⃣ Mettre à jour la structure coordonnée dans `profiles`
    UPDATE public.profiles
    SET coordinated_structure_id = CASE
                                      WHEN p_new_role = 'coordonateur' THEN p_structure_id
                                      ELSE NULL
                                   END
    WHERE id = p_target_user_id;

    -- 5️⃣ Contrôle du quota de 3 coordinateurs
    IF p_new_role = 'coordonateur' AND p_structure_id IS NOT NULL THEN
        PERFORM 1
        FROM public.profiles pp
        WHERE pp.coordinated_structure_id = p_structure_id
        LIMIT 3 OFFSET 2;    -- renvoie une ligne si >3
        IF FOUND THEN
            RAISE EXCEPTION 'Cette structure a déjà le maximum de 3 coordinateurs';
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------
-- Permissions d’exécution
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text, uuid) TO anon, authenticated;
