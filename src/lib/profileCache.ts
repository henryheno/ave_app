import { supabase } from './supabase';
import { getStructures } from './structureCache';
import { queryClient } from './queryClient';

export type CachedProfile = {
  id: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  date_naissance?: string;
  sexe?: string;
  branche?: string;
  fonction?: string;
  comi_id?: string;
  coordinated_structure_id?: string;
  comi?: { id: string; name: string; type?: string };
  [key: string]: any;
};

/**
 * Retourne le profil complet de l'utilisateur connecté depuis le cache React Query.
 * La donnée comi (structure) est enrichie grâce au cache des structures.
 * Toutes les pages qui en ont besoin partagent le même appel réseau.
 */
export const getCurrentProfile = async (forceRefresh = false): Promise<CachedProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const fetchFn = async () => {
    try {
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!pData) return null;

      let finalProfile: CachedProfile = pData;

      if (pData.comi_id) {
        const allStructures = await getStructures();
        const comi = allStructures.find(s => s.id === pData.comi_id);
        if (comi) finalProfile = { ...pData, comi };
      }

      return finalProfile;
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      return null;
    }
  };

  const queryKey = ['userProfileParams'];

  if (forceRefresh) {
    return await queryClient.fetchQuery({
      queryKey,
      queryFn: fetchFn,
      staleTime: 0,
    });
  }

  return await queryClient.ensureQueryData({
    queryKey,
    queryFn: fetchFn,
  });
};

/**
 * Vide le cache du profil (à appeler après une mise à jour du profil).
 */
export const clearProfileCache = () => {
  queryClient.invalidateQueries({ queryKey: ['userProfileParams'] });
};
