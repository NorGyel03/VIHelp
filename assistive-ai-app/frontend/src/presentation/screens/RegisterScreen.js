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

import { registerUser } from '../../utils/authStorage';
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

function SectionHeader({ label }) {
  return (
    <View style={sec.row}>
      <View style={sec.bar} />
      <Text style={sec.text}>{label}</Text>
    </View>
  );
}

const sec = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  bar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.primary,
    marginRight: 10,
  },
  text: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default function RegisterScreen({ navigation }) {
  const login = useStore((s) => s.login);

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    occupation: '',
    dob: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (val) => {
    setError('');
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const validate = () => {
    if (!form.email.trim()) return 'Email is required.';
    if (!form.email.includes('@')) return 'Enter a valid email address.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.firstName.trim()) return 'First name is required.';
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { confirmPassword, ...payload } = form;
      const user = await registerUser(payload);
      login(user);
      // Navigator automatically switches to Main because isLoggedIn=true in store
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={styles.logoSmall}>
            <Ionicons name="eye" size={18} color={C.primary} />
          </View>
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={15} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <SectionHeader label="Account Security" />
          <InputField
            label="Email Address"
            value={form.email}
            onChangeText={setField('email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            icon="mail-outline"
          />
          <InputField
            label="Password"
            value={form.password}
            onChangeText={setField('password')}
            placeholder="Min. 6 characters"
            secureTextEntry
            icon="lock-closed-outline"
          />
          <InputField
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={setField('confirmPassword')}
            placeholder="Re-enter password"
            secureTextEntry
            icon="lock-closed-outline"
          />

          <SectionHeader label="Personal Information" />
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
          />

          <SectionHeader label="Contact & Details" />
          <InputField
            label="Phone Number"
            value={form.phone}
            onChangeText={setField('phone')}
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <InputField
            label="Occupation"
            value={form.occupation}
            onChangeText={setField('occupation')}
            placeholder="Your job or role"
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

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          icon="checkmark-circle-outline"
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.loginLink}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 56,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSmall: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primary + '12',
    borderWidth: 1,
    borderColor: C.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: C.textSub,
    fontSize: 15,
    marginBottom: 24,
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
  errorText: {
    color: C.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  submitBtn: {
    marginBottom: 16,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    color: C.textSub,
    fontSize: 15,
  },
  loginLinkBold: {
    color: C.primary,
    fontWeight: '700',
  },
});
