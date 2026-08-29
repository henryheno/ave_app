import { supabase } from './supabase';
import { queryClient } from './queryClient';

export const fetchStructures = async () => {
    const { data, error } = await supabase
        .from('structures')
        .select('*')
        .order('name');
    if (error) {
        console.error('Erreur lors du chargement des structures:', error);
        return [];
    }
    return data || [];
};

/**
 * Fetch all structures from Supabase using React Query's global cache.
 * The result is cached by React Query to avoid redundant network requests.
 */
export const getStructures = async (forceRefresh = false): Promise<any[]> => {
    if (forceRefresh) {
        return await queryClient.fetchQuery({
            queryKey: ['structures'],
            queryFn: fetchStructures,
            staleTime: 0,
        });
    }

    return await queryClient.ensureQueryData({
        queryKey: ['structures'],
        queryFn: fetchStructures,
    });
};

/**
 * Clear the structures cache manually.
 */
export const clearStructureCache = () => {
    queryClient.invalidateQueries({ queryKey: ['structures'] });
};

