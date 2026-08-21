import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { updateUser } from '../../utils/authStorage';
import { useStore } from '../../store/useStore';
import InputField from '../components/InputField';
import { Toast } from '../components/Toast';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  success: '#00D68F',
  error: '#FF3D57',
  inputBg: '#1A1A2A',
};

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function ReadOnlyField({ icon, label, value }) {
  return (
    <View style={styles.readOnlyWrap}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <View style={styles.readOnlyRow}>
        {icon ? (
          <Ionicons name={icon} size={17} color={C.textSub} style={{ marginRight: 10 }} />
        ) : null}
        <Text style={styles.readOnlyValue}>{value || '—'}</Text>
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={10} color={C.textSub} />
        </View>
      </View>
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const storeUser = useStore((s) => s.user);
  const setStoreUser = useStore((s) => s.setUser);

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (storeUser) {
      setForm({
        firstName: storeUser.firstName || '',
        middleName: storeUser.middleName || '',
        lastName: storeUser.lastName || '',
        phone: storeUser.phone || '',
        occupation: storeUser.occupation || '',
        dob: storeUser.dob || '',
        address: storeUser.address || '',
      });
    }
  }, [storeUser]);

  const setField = (key) => (val) => {
    setSaved(false);
    setError('');
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!form?.firstName?.trim()) {
      setError('First name is required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const updated = await updateUser(form);
      setStoreUser(updated);
      setSaved(true);
      Toast.success('Profile updated successfully!');
      setTimeout(() => navigation.goBack(), 800);
    } catch (err) {
      const msg = err.message || 'Could not save changes. Please try again.';
      setError(msg);
      Toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingView}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Fixed Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnSaved]}
            onPress={handleSave}
            disabled={loading || saved}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : saved ? (
              <Ionicons name="checkmark" size={18} color={C.success} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Feedback Banners ── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={C.error} />
              <Text style={[styles.bannerText, { color: C.error }]}>{error}</Text>
            </View>
          ) : null}

          {saved ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={15} color={C.success} />
              <Text style={[styles.bannerText, { color: C.success }]}>Profile saved!</Text>
            </View>
          ) : null}

          {/* ── Account (read-only) ── */}
          <SectionLabel text="Account" />
          <View style={styles.card}>
            <ReadOnlyField
              icon="mail-outline"
              label="Email Address"
              value={storeUser?.email}
            />
            <Text style={styles.readOnlyHint}>
              Email cannot be changed after registration.
            </Text>
          </View>

          {/* ── Personal Info ── */}
          <SectionLabel text="Personal Information" />
          <View style={styles.card}>
            <InputField
              label="First Name *"
              value={form.firstName}
              onChangeText={setField('firstName')}
              placeholder="First name"
              icon="person-outline"
              autoCapitalize="words"
            />
            <InputField
              label="Middle Name"
              value={form.middleName}
              onChangeText={setField('middleName')}
              placeholder="Middle name (optional)"
              autoCapitalize="words"
            />
            <InputField
              label="Last Name"
              value={form.lastName}
              onChangeText={setField('lastName')}
              placeholder="Last name"
              autoCapitalize="words"
              style={{ marginBottom: 0 }}
            />
          </View>

          {/* ── Contact ── */}
          <SectionLabel text="Contact Details" />
          <View style={styles.card}>
            <InputField
              label="Phone Number"
              value={form.phone}
              onChangeText={setField('phone')}
              placeholder="+1 234 567 8900"
              keyboardType="phone-pad"
              icon="call-outline"
              style={{ marginBottom: 0 }}
            />
          </View>

          {/* ── Additional ── */}
          <SectionLabel text="Additional Info" />
          <View style={styles.card}>
            <InputField
              label="Occupation"
              value={form.occupation}
              onChangeText={setField('occupation')}
              placeholder="Job title or role"
              icon="briefcase-outline"
              autoCapitalize="words"
            />
            <InputField
              label="Date of Birth"
              value={form.dob}
              onChangeText={setField('dob')}
              placeholder="YYYY-MM-DD"
              icon="calendar-outline"
            />
            <InputField
              label="Address"
              value={form.address}
              onChangeText={setField('address')}
              placeholder="Home address"
              icon="location-outline"
              multiline
              autoCapitalize="sentences"
              style={{ marginBottom: 0 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    minWidth: 68,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary + '18',
    borderWidth: 1,
    borderColor: C.primary + '50',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  saveBtnSaved: {
    backgroundColor: C.success + '18',
    borderColor: C.success + '50',
  },
  saveBtnText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.error + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.error + '50',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.success + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.success + '50',
  },
  bannerText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  sectionLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
  },
  readOnlyWrap: {
    marginBottom: 4,
  },
  readOnlyLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  readOnlyValue: {
    flex: 1,
    color: C.textSub,
    fontSize: 15,
  },
  lockedBadge: {
    marginLeft: 8,
  },
  readOnlyHint: {
    color: C.textSub,
    fontSize: 12,
    marginTop: 8,
    paddingLeft: 2,
  },
});
