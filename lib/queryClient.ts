import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

// 1. TanStack Query se entera del estado de la red: pausa sin conexion y reanuda al volver
onlineManager.setEventListener((setOnline) => {
  let initialised = false;
  const subscription = Network.addNetworkStateListener((state) => {
    initialised = true;
    setOnline(!!state.isConnected);
  });
  Network.getNetworkStateAsync()
    .then((state) => {
      if (!initialised) setOnline(!!state.isConnected);
    })
    .catch(() => {});
  return () => subscription.remove();
});

// 2. TanStack Query se entera de cuando la app vuelve a primer plano
export function useAppFocusManager() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}

// 3. Hook para que la UI muestre si hay conexion
export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Tras cada cambio local. Sin red la consulta queda en pausa y se reanuda sola. */
export function requestSync() {
  void queryClient.invalidateQueries({ queryKey: ['sync'] });
}
