import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/hooks/useSync';

export function SyncIndicator() {
  const { isOnline, pendingCount, isSyncing, error, syncNow } = useSync();
  const { signOut } = useAuth();

  const status = (() => {
    if (!isOnline) {
      return pendingCount > 0 ? `Sin conexion · ${pendingCount} pendientes` : 'Sin conexion';
    }
    if (isSyncing) return 'Sincronizando...';
    if (error) return `Error al sincronizar: ${error.message}`;
    return pendingCount > 0 ? `${pendingCount} pendientes` : 'Al dia';
  })();

  return (
    <View style={styles.row}>
      <Text style={[styles.status, error && isOnline ? styles.error : null]} numberOfLines={2}>
        {status}
      </Text>
      <Pressable onPress={() => void syncNow()} disabled={!isOnline || isSyncing}>
        <Text style={[styles.action, (!isOnline || isSyncing) && styles.disabled]}>Sincronizar</Text>
      </Pressable>
      <Pressable onPress={() => void signOut()}>
        <Text style={styles.action}>Salir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { flex: 1, color: '#e2e8f0' },
  error: { color: '#f87171' },
  action: { color: '#38bdf8', fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
