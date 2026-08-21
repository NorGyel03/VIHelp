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

import { resetPasswordApi } from '../../data/repositories/authRepository';
import { Toast } from '../components/Toast';
import InputField from '../components/InputField';
import Button from '../components/Button';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  success: '#00D68F',
  error: '#FF3D57',
};

export default function ResetPasswordScreen({ navigation, route }) {
  const email = route.params?.email || '';

  const [form, setForm]       = useState({ otp: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const setField = (key) => (val) => {
    setError('');
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const validate = () => {
    if (!form.otp.trim())          return 'Please enter the OTP code.';
    if (form.otp.trim().length !== 6) return 'OTP must be 6 digits.';
    if (!form.newPassword)         return 'New password is required.';
    if (form.newPassword.length < 6) return 'Password must be at least 6 characters.';
    if (form.newPassword !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleReset = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);

    try {
      await resetPasswordApi(email, form.otp.trim(), form.newPassword);
      setDone(true);
      Toast.success('Password reset! Please sign in.', 4000);
    } catch (err) {
      setError(err.message || 'Could not reset password. Please try again.');
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
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {done ? (
            /* ── Success state ── */
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={52} color={C.success} />
              </View>
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successText}>
                Your password has been updated successfully.{'\n'}
                Sign in with your new password.
              </Text>
              <Button
                title="Go to Sign In"
                onPress={() => navigation.navigate('Login')}
                icon="log-in-outline"
                style={styles.goLoginBtn}
              />
            </View>
          ) : (
            <>
              {/* ── Icon + description ── */}
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark-outline" size={34} color={C.primary} />
              </View>
              <Text style={styles.title}>Enter your reset code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {/* ── Error ── */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={15} color={C.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* ── Form ── */}
              <View style={styles.card}>
                <InputField
                  label="OTP Code"
                  value={form.otp}
                  onChangeText={setField('otp')}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  icon="key-outline"
                  autoCapitalize="none"
                />
                <InputField
                  label="New Password"
                  value={form.newPassword}
                  onChangeText={setField('newPassword')}
                  placeholder="Min. 6 characters"
                  secureTextEntry
                  icon="lock-open-outline"
                />
                <InputField
                  label="Confirm New Password"
                  value={form.confirm}
                  onChangeText={setField('confirm')}
                  placeholder="Re-enter new password"
                  secureTextEntry
                  icon="lock-open-outline"
                  style={{ marginBottom: 0 }}
                />
              </View>

              <Button
                title="Reset Password"
                onPress={handleReset}
                loading={loading}
                icon="shield-checkmark-outline"
              />

              <TouchableOpacity
                style={styles.backToForgot}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.backToForgotText}>
                  Didn't receive a code?{' '}
                  <Text style={styles.backToForgotLink}>Request again</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: { color: C.primary, fontWeight: '600' },
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
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  backToForgot: { alignItems: 'center', marginTop: 24 },
  backToForgotText: { color: C.textSub, fontSize: 14 },
  backToForgotLink: { color: C.primary, fontWeight: '700' },

  // Success state
  successWrap: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: C.success + '14',
    borderWidth: 1,
    borderColor: C.success + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: { color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  successText: {
    color: C.textSub,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  goLoginBtn: { width: '100%' },
});
