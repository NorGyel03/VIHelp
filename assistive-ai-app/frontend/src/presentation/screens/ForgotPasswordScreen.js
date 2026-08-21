import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { forgotPasswordApi } from '../../data/repositories/authRepository';
import InputField from '../components/InputField';
import Button from '../components/Button';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  accent: '#7C4DFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  success: '#00D68F',
  warning: '#FFAA00',
  error: '#FF3D57',
};

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [otpInfo, setOtpInfo] = useState(null); // { otp, expiresAt }

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    if (!trimmed.includes('@')) { setError('Enter a valid email address.'); return; }

    setError('');
    setLoading(true);

    try {
      const result = await forgotPasswordApi(trimmed);
      setOtpInfo({ otp: result.otp, expiresAt: result.expiresAt });
    } catch (err) {
      setError(err.message || 'Could not send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Icon ── */}
          <View style={styles.iconWrap}>
            <Ionicons name="lock-open-outline" size={36} color={C.primary} />
          </View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter the email linked to your account and we'll send you a reset code.
          </Text>

          {/* ── Error banner ── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={C.error} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Dev-mode OTP box ── */}
          {otpInfo ? (
            <View style={styles.otpBox}>
              <View style={styles.otpHeader}>
                <Ionicons name="construct-outline" size={15} color={C.warning} />
                <Text style={styles.otpHeaderText}>Dev Mode — OTP Code</Text>
              </View>
              <Text style={styles.otpCode}>{otpInfo.otp}</Text>
              <Text style={styles.otpNote}>
                In production this code would be emailed to you.{'\n'}
                It expires in 15 minutes.
              </Text>
            </View>
          ) : null}

          {/* ── Email field ── */}
          <View style={styles.card}>
            <InputField
              label="Email Address"
              value={email}
              onChangeText={(v) => { setError(''); setEmail(v); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              style={{ marginBottom: 0 }}
            />
          </View>

          <Button
            title={otpInfo ? 'Resend Code' : 'Send Reset Code'}
            onPress={handleSend}
            loading={loading}
            icon="send-outline"
          />

          {/* ── Continue to reset ── */}
          {otpInfo ? (
            <Button
              title="Enter Code & Reset Password"
              onPress={() =>
                navigation.navigate('ResetPassword', {
                  email: email.trim().toLowerCase(),
                })
              }
              variant="secondary"
              icon="shield-checkmark-outline"
              style={styles.continueBtn}
            />
          ) : null}

          {/* ── Back to login ── */}
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backToLoginText}>
              Remembered your password?{' '}
              <Text style={styles.backToLoginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 56,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: C.primary + '14',
    borderWidth: 1,
    borderColor: C.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: C.textSub,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
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
  bannerText: { color: C.error, fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '500' },

  // Dev OTP box
  otpBox: {
    backgroundColor: C.warning + '10',
    borderWidth: 1,
    borderColor: C.warning + '40',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  otpHeaderText: { color: C.warning, fontSize: 11, fontWeight: '700', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  otpCode: {
    color: C.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: 10,
  },
  otpNote: {
    color: C.textSub,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  continueBtn: { marginTop: 12 },
  backToLogin: { alignItems: 'center', marginTop: 24 },
  backToLoginText: { color: C.textSub, fontSize: 14 },
  backToLoginLink: { color: C.primary, fontWeight: '700' },
});
