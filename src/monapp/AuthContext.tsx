/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { type ProfileAccessStatus } from '../lib/profileAccess';

interface AuthContextType {
  user: User | null;
  role: string | null;
  profileAccess: ProfileAccessStatus | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profileAccess: null,
  isLoading: true,
  refreshAuth: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(() => {
    const cached = localStorage.getItem('ave_auth_role');
    return cached ? JSON.parse(cached) : null;
  });
  const [profileAccess, setProfileAccess] = useState<ProfileAccessStatus | null>(() => {
    const cached = localStorage.getItem('ave_auth_profile');
    return cached ? JSON.parse(cached) : null;
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async function fetchUserDataInternal(currentSession: Session | null, retries = 3) {
    const currentUser = currentSession?.user ?? null;
    const accessToken = currentSession?.access_token ?? null;

    console.log('[AuthContext] fetchUserData appelé', { userId: currentUser?.id ?? 'null', retries });
    
    // N'afficher le loader bloquant que si on n'a pas encore de profil chargé
    // (Évite de détruire l'interface utilisateur lors d'un rafraîchissement de token en arrière-plan)
    if (!user) {
      setIsLoading(true);
    }

    if (!currentUser || !accessToken) {
      console.log('[AuthContext] Aucun utilisateur → état non-authentifié');
      setUser(null);
      setRole(null);
      setProfileAccess({ kind: 'unauthenticated' });
      localStorage.removeItem('ave_auth_role');
      localStorage.removeItem('ave_auth_profile');
      setIsLoading(false);
      return;
    }

    try {
      setUser(currentUser);
      console.log('[AuthContext] Récupération du rôle et du profileAccess (via supabase-js)');

      // 1. Fetch role et nom
      const { data: roleData, error: roleError } = await supabase
        .from('utilisateurs')
        .select('role, nom')
        .eq('id', currentUser.id);

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        console.log('[AuthContext] Rôle trouvé :', roleData[0].role);
        setRole(roleData[0].role);
        localStorage.setItem('ave_auth_role', JSON.stringify(roleData[0].role));

        const currentNom = roleData[0].nom;
        const meta = currentUser.user_metadata || {};
        const googleName = meta.full_name || meta.name;

        if (googleName && (!currentNom || currentNom === 'Utilisateur')) {
            console.log('[AuthContext] Mise à jour du nom par défaut ("Utilisateur") par le nom Google :', googleName);
            const { error: patchErr } = await supabase.from('utilisateurs').update({ nom: googleName }).eq('id', currentUser.id);
            if (patchErr) console.warn('[AuthContext] Échec mise à jour du nom :', patchErr);
        }
      } else {
        console.log('[AuthContext] Aucun rôle → création automatique (OAuth/Google)');
        const metaForRole = currentUser.user_metadata || {};
        const displayName = metaForRole.full_name || metaForRole.name || currentUser.email || '';
        
        const { error: insertErr } = await supabase.from('utilisateurs').insert({ id: currentUser.id, role: 'membre', nom: displayName });
        if (insertErr) {
            const { error: fallbackErr } = await supabase.from('utilisateurs').insert({ id: currentUser.id, role: 'membre' });
            if (fallbackErr) console.warn('[AuthContext] Échec insertion utilisateurs (non bloquant):', fallbackErr);
        }
        setRole('membre');
        localStorage.setItem('ave_auth_role', JSON.stringify('membre'));
      }

      // 2. Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, comi_id, nom, prenom')
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      let accessStatus: ProfileAccessStatus = { kind: 'incomplete', userId: currentUser.id };

      if (profileData && profileData.length > 0) {
        const currentNom = profileData[0].nom;
        const meta = currentUser.user_metadata || {};
        const fullName: string = meta.full_name || meta.name || '';
        const parts = fullName.trim().split(' ');
        const googlePrenom = parts[0] || meta.given_name || '';
        const googleNom = parts.slice(1).join(' ') || meta.family_name || '';

        if (fullName && (!currentNom || currentNom === 'Utilisateur' || currentNom.trim() === '')) {
          console.log('[AuthContext] Mise à jour du profil par défaut avec les données Google');
          const { error: patchErr } = await supabase.from('profiles').update({ nom: googleNom, prenom: googlePrenom }).eq('id', currentUser.id);
          if (patchErr) console.warn('[AuthContext] Échec mise à jour du profil :', patchErr);
        }

        if (profileData[0].comi_id) {
          console.log('[AuthContext] Profil complet (comi_id présent)');
          accessStatus = { kind: 'complete', userId: currentUser.id };
        } else {
          console.log('[AuthContext] Profil incomplet (comi_id absent)');
        }
      } else {
        console.log('[AuthContext] Aucun profil → création automatique depuis metadata Google');
        const meta = currentUser.user_metadata || {};
        const fullName: string = meta.full_name || meta.name || '';
        const parts = fullName.trim().split(' ');
        const prenom = parts[0] || meta.given_name || '';
        const nom = parts.slice(1).join(' ') || meta.family_name || '';
        
        const { error: profileInsertErr } = await supabase.from('profiles').insert({
            id: currentUser.id,
            nom: nom || '',
            prenom: prenom || ''
        });

        if (!profileInsertErr) {
            console.log('[AuthContext] Profil de base créé → incomplet (redirection /complete-profile)');
            const { error: notifErr } = await supabase.from('notifications').insert({
                user_id: currentUser.id,
                title: 'Bienvenue sur Ave ! 🎉',
                content: `Ave ${prenom || 'cher membre'}, bienvenue dans notre application ! Nous sommes ravis de t'accueillir.`,
                type: 'system',
                entity_type: 'profile',
                entity_id: currentUser.id,
                is_read: false,
            });
            if (notifErr) console.warn('[AuthContext] Échec notification bienvenue (non bloquant):', notifErr);
        } else {
            console.warn('[AuthContext] Échec insertion profiles (non bloquant):', profileInsertErr);
        }
        accessStatus = { kind: 'incomplete', userId: currentUser.id };
      }

      setProfileAccess(accessStatus);
      localStorage.setItem('ave_auth_profile', JSON.stringify(accessStatus));

      console.log('[AuthContext] ✅ Chargement terminé. isLoading → false');
      setIsLoading(false);
    } catch (error) {
      console.error('[AuthContext] ❌ Erreur lors du fetchUserData:', error);
      if (retries > 0) {
        console.log(`[AuthContext] Nouvelle tentative dans 2s... (${retries} essais restants)`);
        setTimeout(() => fetchUserDataInternal(currentSession, retries - 1), 2000);
      } else {
        console.warn('[AuthContext] Plus de tentatives disponibles.');
        const cached = localStorage.getItem('ave_auth_profile');
        if (cached) {
          console.log('[AuthContext] Cache profileAccess trouvé → conservation du cache');
        } else {
          console.warn('[AuthContext] Pas de cache → forçage état unauthenticated');
          setProfileAccess({ kind: 'unauthenticated' });
        }
        setIsLoading(false);
      }
    }
  }, []);

  const refreshAuth = async () => {
    console.log('[AuthContext] refreshAuth appelé');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[AuthContext] Session récupérée:', session?.user?.email ?? 'aucune');
    await fetchUserData(session ?? null);
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] onAuthStateChange →', event, 'user:', session?.user?.email ?? 'aucune');

        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          import('../lib/queryClient').then(({ queryClient }) => {
            queryClient.clear();
          });
        }

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'PASSWORD_RECOVERY'
        ) {
          setTimeout(() => {
            if (mounted) fetchUserData(session ?? null);
          }, 10);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écoute en temps réel des changements de rôle
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:utilisateurs:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'utilisateurs', filter: `id=eq.${user.id}` },
        (payload) => {
          console.log('[AuthContext] Changement en temps réel détecté pour utilisateurs:', payload);
          if (payload.new && payload.new.role) {
            setRole(payload.new.role);
            localStorage.setItem('ave_auth_role', JSON.stringify(payload.new.role));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, role, profileAccess, isLoading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
