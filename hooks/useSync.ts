import { skipToken, useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { useAuth } from '@/context/AuthContext';
import { photosRepo } from '@/db/repositories/photos';
import { useIsOnline } from '@/lib/queryClient';
import { syncAll } from '@/services/sync';

/** La sincronizacion como consulta: TanStack Query la dispara, la pausa y la reintenta. */
export function useSync() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const isOnline = useIsOnline();
  const { data: pending } = useLiveQuery(photosRepo.pendingQuery());

  const sync = useQuery({
    queryKey: ['sync', userId],
    queryFn: userId ? () => syncAll(userId) : skipToken,
    staleTime: 0,
    retry: 2,
    refetchOnReconnect: 'always', // volvio la red
    refetchOnWindowFocus: 'always', // la app volvio a primer plano
  });

  return {
    isOnline,
    pendingCount: pending.length,
    isSyncing: sync.fetchStatus === 'fetching',
    lastResult: sync.data,
    error: sync.error,
    syncNow: () => sync.refetch(),
  };
}
