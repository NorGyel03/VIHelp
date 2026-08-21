import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { loginUser } from '../../utils/authStorage';
import { useStore } from '../../store/useStore';
import InputField from '../components/InputField';
import Button from '../components/Button';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  error: '#FF3D57',
};

export default function LoginScreen({ navigation }) {
  const login = useStore((s) => s.login);

  const [identifier, setIdentifier] = useState('');   // email OR phone
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const validate = () => {
    if (!identifier.trim()) return 'Email or phone number is required.';
    if (!password)          return 'Password is required.';
    return null;
  };

  const handleLogin = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);

    try {
      const user = await loginUser(identifier.trim(), password);
      login(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <Ionicons name="eye" size={36} color={C.primary} />
          </View>
          <Text style={styles.appName}>AssistiveAI</Text>
          <Text style={styles.tagline}>Your AI-powered vision companion</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to continue</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <InputField
            label="Email or Phone Number"
            value={identifier}
            onChangeText={(v) => { setError(''); setIdentifier(v); }}
            placeholder="you@example.com or +1 234 567 8900"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="person-outline"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={(v) => { setError(''); setPassword(v); }}
            placeholder="Your password"
            secureTextEntry
            icon="lock-closed-outline"
          />

          {/* Forgot password link */}
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.signInBtn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>
              {"Don't have an account? "}
              <Text style={styles.registerLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>AssistiveAI v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoArea: { alignItems: 'center', marginBottom: 44 },
  logoRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    borderColor: C.primary + '50',
    backgroundColor: C.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  appName:  { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  tagline:  { color: C.textSub, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSub:   { color: C.textSub, fontSize: 14, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.error + '18',
    borderWidth: 1,
    borderColor: C.error + '55',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: C.error, fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '500' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 16 },
  forgotText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  signInBtn: { marginTop: 0 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textSub, fontSize: 13, marginHorizontal: 14 },
  registerBtn: { alignItems: 'center', paddingVertical: 4 },
  registerText: { color: C.textSub, fontSize: 15 },
  registerLink: { color: C.primary, fontWeight: '700' },
  version: { color: C.textSub + '60', fontSize: 12, textAlign: 'center' },
});
