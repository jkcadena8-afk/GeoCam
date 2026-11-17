import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (action: typeof signIn) => {
    if (!email.trim() || !password) {
      setMessage('Escribe tu correo y tu contrasena.');
      return;
    }
    setIsBusy(true);
    setMessage(await action(email.trim(), password));
    setIsBusy(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GeoCam</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contrasena"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {isBusy ? (
        <ActivityIndicator />
      ) : (
        <>
          <Pressable style={styles.primary} onPress={() => void submit(signIn)}>
            <Text style={styles.primaryText}>Iniciar sesion</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => void submit(signUp)}>
            <Text style={styles.secondaryText}>Crear cuenta</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#0b1020' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#1f2a44',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    backgroundColor: '#151b2e',
  },
  message: { color: '#fbbf24' },
  primary: { padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#38bdf8' },
  primaryText: { color: '#04121f', fontWeight: '700' },
  secondary: { padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#38bdf8' },
  secondaryText: { color: '#38bdf8', fontWeight: '700' },
});
