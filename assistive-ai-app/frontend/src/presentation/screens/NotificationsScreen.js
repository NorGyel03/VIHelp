import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY = 'notification_prefs';

const DEFAULT_PREFS = {
  detectionAlerts: true,
  deviceConnected: true,
  deviceDisconnected: true,
  lowBattery: true,
  weeklyReport: false,
  appUpdates: false,
  systemAlerts: true,
};

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function ToggleRow({ icon, iconColor, label, sublabel, value, onChange, isLast }) {
  return (
    <>
      <View style={styles.toggleRow}>
        <View style={[styles.toggleIcon, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {sublabel ? <Text style={styles.toggleSub}>{sublabel}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#2A2A3E', true: C.primary + '60' }}
          thumbColor={value ? C.primary : '#4A4A5E'}
          ios_backgroundColor="#2A2A3E"
        />
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  const toggle = (key) => (val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.savedBadge}>
          {saved ? (
            <>
              <Ionicons name="checkmark-circle" size={14} color={C.success} />
              <Text style={styles.savedText}>Saved</Text>
            </>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Detections ── */}
        <SectionLabel text="AI & Detections" />
        <View style={styles.card}>
          <ToggleRow
            icon="scan-outline"
            iconColor={C.primary}
            label="Detection Alerts"
            sublabel="Notify when an object is detected"
            value={prefs.detectionAlerts}
            onChange={toggle('detectionAlerts')}
          />
          <ToggleRow
            icon="bar-chart-outline"
            iconColor={C.accent}
            label="Weekly Report"
            sublabel="Summary of detections every week"
            value={prefs.weeklyReport}
            onChange={toggle('weeklyReport')}
            isLast
          />
        </View>

        {/* ── Device ── */}
        <SectionLabel text="Device" />
        <View style={styles.card}>
          <ToggleRow
            icon="bluetooth-outline"
            iconColor={C.success}
            label="Device Connected"
            sublabel="Alert when ESP32 pairs successfully"
            value={prefs.deviceConnected}
            onChange={toggle('deviceConnected')}
          />
          <ToggleRow
            icon="bluetooth-outline"
            iconColor={C.error}
            label="Device Disconnected"
            sublabel="Alert when connection is lost"
            value={prefs.deviceDisconnected}
            onChange={toggle('deviceDisconnected')}
          />
          <ToggleRow
            icon="battery-dead-outline"
            iconColor={C.warning}
            label="Low Battery"
            sublabel="Warn when device battery is low"
            value={prefs.lowBattery}
            onChange={toggle('lowBattery')}
            isLast
          />
        </View>

        {/* ── System ── */}
        <SectionLabel text="System" />
        <View style={styles.card}>
          <ToggleRow
            icon="shield-outline"
            iconColor={C.primary}
            label="System Alerts"
            sublabel="Important security and app notices"
            value={prefs.systemAlerts}
            onChange={toggle('systemAlerts')}
          />
          <ToggleRow
            icon="download-outline"
            iconColor={C.textSub}
            label="App Updates"
            sublabel="Get notified about new versions"
            value={prefs.appUpdates}
            onChange={toggle('appUpdates')}
            isLast
          />
        </View>

        {/* ── Info banner ── */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={C.textSub} />
          <Text style={styles.infoText}>
            Preferences are saved automatically and stored on this device.
            Push notification delivery depends on your device's system settings.
          </Text>
        </View>
      </ScrollView>
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
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  savedBadge: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  savedText: {
    color: C.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
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
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 50,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  toggleContent: {
    flex: 1,
    marginRight: 10,
  },
  toggleLabel: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSub: {
    color: C.textSub,
    fontSize: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  infoText: {
    color: C.textSub,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },
});
