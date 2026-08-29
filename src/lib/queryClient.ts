import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (Real-time WebSockets handles instant updates)
      gcTime: 10 * 60 * 1000,   // 10 minutes cache duration (formerly cacheTime)
      refetchOnWindowFocus: false, // Désactivé pour éviter les chargements intempestifs au changement d'onglet
      refetchOnMount: false, // Don't refetch on mount if data is not stale
      retry: 1,
    },
  },
});
