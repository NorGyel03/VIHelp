import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../../store/useStore';
import { changePasswordApi, updateEmailApi } from '../../data/repositories/authRepository';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { Toast } from '../components/Toast';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  accent: '#7C4DFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  success: '#00D68F',
  error: '#FF3D57',
  warning: '#FFAA00',
};

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function InfoRow({ icon, label, value, iconColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: (iconColor || C.primary) + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor || C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function SecurityScreen({ navigation }) {
  const user   = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const setUser = useStore((s) => s.setUser);

  // ── Change Password state ─────────────────────────────────────────
  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoad]  = useState(false);
  const [pwError, setPwError]   = useState('');
  const [pwSuccess, setPwOk]    = useState(false);

  const setPwField = (key) => (val) => { setPwError(''); setPwOk(false); setPwForm((p) => ({ ...p, [key]: val })); };

  const handleChangePassword = async () => {
    if (!pwForm.current)          { setPwError('Current password is required.'); return; }
    if (!pwForm.next)             { setPwError('New password is required.'); return; }
    if (pwForm.next.length < 6)   { setPwError('New password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    if (pwForm.current === pwForm.next) { setPwError('New password must differ from the current one.'); return; }

    setPwError('');
    setPwLoad(true);

    try {
      await changePasswordApi(pwForm.current, pwForm.next);
      setPwOk(true);
      setPwForm({ current: '', next: '', confirm: '' });
      Toast.success('Password changed! Signing you out…', 3500);
      setTimeout(() => logout(), 1800);
    } catch (err) {
      const msg = err.message || 'Could not change password. Please try again.';
      setPwError(msg);
      Toast.error(msg);
    } finally {
      setPwLoad(false);
    }
  };

  // ── Change Email state ────────────────────────────────────────────
  const [emForm, setEmForm]    = useState({ newEmail: '', password: '' });
  const [emLoading, setEmLoad] = useState(false);
  const [emError, setEmError]  = useState('');
  const [emSuccess, setEmOk]   = useState(false);

  const setEmField = (key) => (val) => { setEmError(''); setEmOk(false); setEmForm((p) => ({ ...p, [key]: val })); };

  const handleChangeEmail = async () => {
    const trimmed = emForm.newEmail.trim().toLowerCase();
    if (!trimmed)               { setEmError('New email is required.'); return; }
    if (!trimmed.includes('@')) { setEmError('Enter a valid email address.'); return; }
    if (trimmed === user?.email?.toLowerCase()) { setEmError('New email must be different from your current one.'); return; }
    if (!emForm.password)       { setEmError('Current password is required to confirm.'); return; }

    setEmError('');
    setEmLoad(true);

    try {
      await updateEmailApi(trimmed, emForm.password);
      setEmOk(true);
      setEmForm({ newEmail: '', password: '' });
      Toast.success('Email updated! Signing you out…', 3500);
      setTimeout(() => logout(), 1800);
    } catch (err) {
      const msg = err.message || 'Could not update email. Please try again.';
      setEmError(msg);
      Toast.error(msg);
    } finally {
      setEmLoad(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Account Info ── */}
          <SectionLabel text="Account" />
          <View style={styles.card}>
            <InfoRow icon="mail-outline"          label="Email Address"   value={user?.email} />
            <View style={styles.divider} />
            <InfoRow icon="calendar-outline"      label="Member Since"    value={memberSince}          iconColor={C.accent} />
            <View style={styles.divider} />
            <InfoRow icon="shield-checkmark-outline" label="Account Status" value="Active & Verified"  iconColor={C.success} />
          </View>

          {/* ── Change Password ── */}
          <SectionLabel text="Change Password" />

          {pwError ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={15} color={C.error} />
              <Text style={[styles.bannerText, { color: C.error }]}>{pwError}</Text>
            </View>
          ) : null}

          {pwSuccess ? (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Ionicons name="checkmark-circle" size={15} color={C.success} />
              <Text style={[styles.bannerText, { color: C.success }]}>Password changed — signing you out…</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <InputField
              label="Current Password"
              value={pwForm.current}
              onChangeText={setPwField('current')}
              placeholder="Enter current password"
              secureTextEntry
              icon="lock-closed-outline"
            />
            <InputField
              label="New Password"
              value={pwForm.next}
              onChangeText={setPwField('next')}
              placeholder="Min. 6 characters"
              secureTextEntry
              icon="lock-open-outline"
            />
            <InputField
              label="Confirm New Password"
              value={pwForm.confirm}
              onChangeText={setPwField('confirm')}
              placeholder="Re-enter new password"
              secureTextEntry
              icon="lock-open-outline"
              style={{ marginBottom: 0 }}
            />
          </View>

          <Button title="Update Password" onPress={handleChangePassword} loading={pwLoading} icon="shield-checkmark-outline" />

          {/* ── Change Email ── */}
          <SectionLabel text="Change Email" />

          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={15} color={C.textSub} />
            <Text style={styles.infoNoteText}>
              Changing your email will sign you out. Use the new email to log in.
            </Text>
          </View>

          {emError ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={15} color={C.error} />
              <Text style={[styles.bannerText, { color: C.error }]}>{emError}</Text>
            </View>
          ) : null}

          {emSuccess ? (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Ionicons name="checkmark-circle" size={15} color={C.success} />
              <Text style={[styles.bannerText, { color: C.success }]}>Email updated — signing you out…</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <InputField
              label="New Email Address"
              value={emForm.newEmail}
              onChangeText={setEmField('newEmail')}
              placeholder="new@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
            />
            <InputField
              label="Current Password (to confirm)"
              value={emForm.password}
              onChangeText={setEmField('password')}
              placeholder="Enter your password"
              secureTextEntry
              icon="lock-closed-outline"
              style={{ marginBottom: 0 }}
            />
          </View>

          <Button title="Update Email" onPress={handleChangeEmail} loading={emLoading} icon="mail-outline" variant="secondary" />

          {/* ── Password Tips ── */}
          <SectionLabel text="Password Tips" />
          <View style={styles.tipsCard}>
            {[
              'Use at least 8 characters',
              'Mix uppercase, lowercase, numbers and symbols',
              'Avoid using your name or email in the password',
              "Don't reuse passwords from other sites",
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* ── Session ── */}
          <SectionLabel text="Session" />
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() =>
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
                ])
              }
              activeOpacity={0.7}
            >
              <View style={styles.dangerIcon}>
                <Ionicons name="log-out-outline" size={17} color={C.error} />
              </View>
              <Text style={styles.dangerLabel}>Sign Out of Account</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textSub} />
            </TouchableOpacity>
          </View>
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 56 },
  sectionLabel: {
    color: C.textSub, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 50 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoLabel: { color: C.textSub, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { color: C.text, fontSize: 14, fontWeight: '500' },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.error + '18', borderWidth: 1, borderColor: C.error + '55',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  bannerSuccess: { backgroundColor: C.success + '18', borderColor: C.success + '55' },
  bannerText: { fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '500' },
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 12, marginBottom: 14,
  },
  infoNoteText: { color: C.textSub, fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 },
  tipsCard: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 20,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary, marginTop: 6, marginRight: 10 },
  tipText: { color: C.textSub, fontSize: 13, flex: 1, lineHeight: 19 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  dangerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.error + '18', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dangerLabel: { flex: 1, color: C.error, fontSize: 14, fontWeight: '600' },
});
