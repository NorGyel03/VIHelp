import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';

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

const APP_VERSION = '1.0.0';

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SettingRow({ icon, iconColor, label, sublabel, value, onPress, isLast, destructive }) {
  const textColor = destructive ? C.error : C.text;
  const bgColor = destructive ? C.error : iconColor || C.primary;

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={[styles.rowIcon, { backgroundColor: bgColor + '18' }]}>
          <Ionicons name={icon} size={18} color={destructive ? C.error : iconColor || C.primary} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
          {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
        </View>
        {value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color={C.textSub} />
        ) : null}
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function SettingsScreen({ navigation }) {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User quick-info ── */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {[user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* ── Account ── */}
        <SectionLabel text="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            iconColor={C.accent}
            label="Change Password"
            sublabel="Update your login password"
            onPress={() => navigation.navigate('Security')}
          />
          <SettingRow
            icon="notifications-outline"
            iconColor={C.warning}
            label="Notifications"
            sublabel="Detection alerts, device events"
            onPress={() => navigation.navigate('Notifications')}
            isLast
          />
        </View>

        {/* ── Device ── */}
        <SectionLabel text="Device" />
        <View style={styles.card}>
          <SettingRow
            icon="hardware-chip-outline"
            iconColor={C.primary}
            label="Paired Devices"
            sublabel="Manage your ESP32 wearable"
            onPress={() => Alert.alert('Coming Soon', 'Device management will be available in a future update.')}
          />
          <SettingRow
            icon="bluetooth-outline"
            iconColor={C.success}
            label="Bluetooth"
            sublabel="Connection preferences"
            onPress={() => Alert.alert('Coming Soon', 'Bluetooth settings will be available in a future update.')}
            isLast
          />
        </View>

        {/* ── Preferences ── */}
        <SectionLabel text="Preferences" />
        <View style={styles.card}>
          <SettingRow
            icon="moon-outline"
            iconColor={C.accent}
            label="Appearance"
            sublabel="Theme and display options"
            value="Dark"
          />
          <SettingRow
            icon="globe-outline"
            iconColor={C.primary}
            label="Language"
            sublabel="App display language"
            value="English"
            isLast
          />
        </View>

        {/* ── About ── */}
        <SectionLabel text="About" />
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            iconColor={C.textSub}
            label="App Version"
            sublabel="AssistiveAI"
            value={`v${APP_VERSION}`}
          />
          <SettingRow
            icon="document-text-outline"
            iconColor={C.textSub}
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be available soon.')}
          />
          <SettingRow
            icon="reader-outline"
            iconColor={C.textSub}
            label="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'Terms of service will be available soon.')}
            isLast
          />
        </View>

        {/* ── Sign Out ── */}
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            iconColor={C.error}
            label="Sign Out"
            onPress={handleLogout}
            destructive
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 24,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary + '18',
    borderWidth: 2,
    borderColor: C.primary + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userInitials: {
    color: C.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    color: C.textSub,
    fontSize: 12,
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
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  rowSub: {
    color: C.textSub,
    fontSize: 12,
  },
  rowValue: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 50,
  },
});
