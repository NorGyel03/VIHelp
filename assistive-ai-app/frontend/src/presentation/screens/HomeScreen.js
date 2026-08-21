import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useStore } from '../../store/useStore';
import apiClient    from '../../data/api/apiClient';
import { timeAgo }  from '../../utils/timeAgo';
import wifiCamera   from '../../services/wifi/WifiCameraService';

const C = {
  bg:          '#0A0A0F',
  card:        '#12121C',
  border:      '#1E1E2E',
  primary:     '#00AAFF',
  accent:      '#7C4DFF',
  text:        '#E8E8F0',
  textSub:     '#6B7080',
  textMuted:   '#3D4460',
  success:     '#00D68F',
  error:       '#FF3D57',
  warning:     '#FFAA00',
};

// ── Greeting ────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon, iconColor, label, value, sub }) {
  return (
    <View style={[statStyles.card, { borderColor: iconColor + '28' }]}>
      <View style={[statStyles.iconBox, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    color: C.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});

// ── Quick Action ─────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[
        qaStyles.card,
        { borderColor: disabled ? C.border : color + '30' },
        disabled && qaStyles.disabled,
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      disabled={disabled}
    >
      <View style={[qaStyles.iconBox, { backgroundColor: (disabled ? C.textMuted : color) + '18' }]}>
        <Ionicons name={icon} size={22} color={disabled ? C.textMuted : color} />
      </View>
      <Text style={[qaStyles.label, disabled && { color: C.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  disabled: { opacity: 0.5 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },
  label: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ── Status Row ───────────────────────────────────────────────────────
function StatusRow({ icon, label, statusText, ok, loading }) {
  const dotColor = ok ? C.success : C.textSub;
  return (
    <View style={srStyles.row}>
      <View style={[srStyles.iconBox, { backgroundColor: dotColor + '18' }]}>
        <Ionicons name={icon} size={16} color={dotColor} />
      </View>
      <Text style={srStyles.label}>{label}</Text>
      <View style={[srStyles.badge, { backgroundColor: dotColor + '18' }]}>
        {!loading && <View style={[srStyles.dot, { backgroundColor: dotColor }]} />}
        <Text style={[srStyles.status, { color: dotColor }]}>
          {loading ? '…' : statusText}
        </Text>
      </View>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: { flex: 1, color: C.text, fontSize: 14, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  status: { fontSize: 12, fontWeight: '600' },
});

// ── Detection Item ────────────────────────────────────────────────────
function DetectionItem({ item }) {
  const confidence = Math.round((item.confidence || 0) * 100);
  const color =
    confidence >= 80 ? C.success : confidence >= 50 ? C.warning : C.error;

  return (
    <View style={detStyles.row}>
      <View style={detStyles.iconBox}>
        <Ionicons name="scan-outline" size={16} color={C.primary} />
      </View>
      <View style={detStyles.content}>
        <Text style={detStyles.label}>{item.label}</Text>
        <Text style={detStyles.time}>{timeAgo(item.created_at)}</Text>
      </View>
      <View style={[detStyles.confBadge, { backgroundColor: color + '18' }]}>
        <Text style={[detStyles.conf, { color }]}>{confidence}%</Text>
      </View>
    </View>
  );
}

const detStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  label: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  time:  { color: C.textSub, fontSize: 12 },
  confBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  conf: { fontSize: 12, fontWeight: '700' },
});

// ── Get Started Card ──────────────────────────────────────────────────
function GetStartedCard({ onScan, cameraMode }) {
  const steps = cameraMode === 'serial'
    ? [
        { icon: 'link-outline',          color: C.primary,  text: 'Plug ESP32 into PC via USB-C' },
        { icon: 'desktop-outline',       color: C.accent,   text: 'Run AI service: python app.py' },
        { icon: 'videocam-outline',      color: C.success,  text: 'Open Camera tab for live feed' },
      ]
    : [
        { icon: 'wifi-outline',          color: C.primary,  text: 'Connect ESP32 camera via Wi-Fi' },
        { icon: 'videocam-outline',      color: C.accent,   text: 'Open Camera tab for live feed' },
        { icon: 'bar-chart-outline',     color: C.success,  text: 'View AI detections in real time' },
      ];

  return (
    <View style={gsStyles.card}>
      <View style={gsStyles.header}>
        <Ionicons name="rocket-outline" size={18} color={C.primary} />
        <Text style={gsStyles.title}>Get Started</Text>
      </View>
      <Text style={gsStyles.sub}>Follow these steps to begin using AssistiveAI:</Text>
      {steps.map((s, i) => (
        <View key={i} style={gsStyles.step}>
          <View style={[gsStyles.stepNum, { backgroundColor: s.color + '18' }]}>
            <Text style={[gsStyles.stepNumText, { color: s.color }]}>{i + 1}</Text>
          </View>
          <View style={[gsStyles.stepIcon, { backgroundColor: s.color + '14' }]}>
            <Ionicons name={s.icon} size={15} color={s.color} />
          </View>
          <Text style={gsStyles.stepText}>{s.text}</Text>
        </View>
      ))}
      <TouchableOpacity style={gsStyles.btn} onPress={onScan} activeOpacity={0.8}>
        <Ionicons name="wifi-outline" size={16} color="#fff" />
        <Text style={gsStyles.btnText}>Check Connection</Text>
      </TouchableOpacity>
    </View>
  );
}

const gsStyles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.primary + '30',
    padding: 18,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  sub: {
    color: C.textSub,
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    color: C.textSub,
    fontSize: 13,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

// ═══════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const user            = useStore((s) => s.user);
  const isConnected     = useStore((s) => s.isConnected);
  const cameraConnected = useStore((s) => s.cameraConnected);
  const cameraMode      = useStore((s) => s.cameraMode);
  const setCameraConn   = useStore((s) => s.setCameraConnected);
  const setCameraMode   = useStore((s) => s.setCameraMode);
  const setCameraSource = useStore((s) => s.setCameraSource);

  const [apiOnline,       setApiOnline]       = useState(null);
  const [scanning,        setScanning]        = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [detections,      setDetections]      = useState([]);
  const [detectionTotal,  setDetectionTotal]  = useState(0);
  const [deviceCount,     setDeviceCount]     = useState(0);

  const fetchData = useCallback(async () => {
    // ── Health check ──────────────────────────────────────────────
    try {
      await apiClient.get('/health');
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }

    // ── Detections (fetch up to 50 for a realistic count) ─────────
    try {
      const res = await apiClient.get('/detections/me?limit=50');
      const list = res.data.detections || [];
      setDetections(list.slice(0, 5));         // show only 5 in preview
      setDetectionTotal(
        res.data.total != null ? res.data.total : list.length
      );
    } catch {
      // No device registered yet — that's fine
    }

    // ── Device count ──────────────────────────────────────────────
    try {
      const res = await apiClient.get('/devices/me');
      setDeviceCount((res.data.devices || []).length);
    } catch {
      setDeviceCount(0);
    }

    // ── Camera / AI service status ──────────────────────────────────
    try {
      const status = await wifiCamera.getStatus();
      setCameraConn(status.camera_connected);
      setCameraMode(status.camera_mode || null);
      setCameraSource(status.camera_source || null);
    } catch {
      setCameraConn(false);
      setCameraMode(null);
      setCameraSource(null);
    }
  }, [setCameraConn, setCameraMode, setCameraSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const status = await wifiCamera.getStatus();
      setCameraConn(status.camera_connected);
      setCameraMode(status.camera_mode || null);
      setCameraSource(status.camera_source || null);
    } catch {
      setCameraConn(false);
    } finally {
      setScanning(false);
    }
  };

  const firstName = user?.firstName || 'there';
  const deviceOnline = isConnected || cameraConnected;
  const isNewUser = detections.length === 0 && !deviceOnline;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>
              {firstName}
              {user?.lastName ? ` ${user.lastName}` : ''}
            </Text>
          </View>
          <View
            style={[
              styles.connBadge,
              { backgroundColor: deviceOnline ? C.success + '18' : C.error + '14' },
            ]}
          >
            <View
              style={[styles.connDot, { backgroundColor: deviceOnline ? C.success : C.error }]}
            />
            <Text style={[styles.connText, { color: deviceOnline ? C.success : C.error }]}>
              {deviceOnline
                ? (cameraMode === 'serial' ? 'USB Connected' : 'Wi-Fi Connected')
                : 'Offline'}
            </Text>
          </View>
        </View>

        {/* ── Device Card ── */}
        <View
          style={[
            styles.deviceCard,
            { borderColor: deviceOnline ? C.success + '40' : C.border },
          ]}
        >
          <View style={styles.deviceLeft}>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: deviceOnline ? C.success + '18' : C.error + '12' },
              ]}
            >
              <Ionicons
                name="hardware-chip"
                size={26}
                color={deviceOnline ? C.success : C.error}
              />
            </View>
            <View>
              <Text style={styles.deviceName}>ESP32-S3 Camera</Text>
              <Text
                style={[
                  styles.deviceStatus,
                  { color: deviceOnline ? C.success : C.textSub },
                ]}
              >
                {deviceOnline
                  ? `● ${cameraMode === 'serial' ? 'USB Serial' : 'Wi-Fi'} Connected`
                  : cameraMode
                  ? `● ${cameraMode === 'serial' ? 'Serial' : 'Wi-Fi'} — Waiting for camera`
                  : '● AI Service offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, scanning && { opacity: 0.55 }]}
            onPress={handleScan}
            disabled={scanning}
          >
            <Ionicons
              name={scanning ? 'hourglass-outline' : cameraMode === 'serial' ? 'link-outline' : 'wifi-outline'}
              size={15}
              color={C.primary}
            />
            <Text style={styles.scanBtnText}>{scanning ? 'Checking…' : 'Check'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Get Started (only for new users) ── */}
        {isNewUser && <GetStartedCard onScan={handleScan} cameraMode={cameraMode} />}

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="scan-outline"
            iconColor={C.primary}
            label="Detections"
            value={detectionTotal}
            sub="All time"
          />
          <StatCard
            icon="hardware-chip-outline"
            iconColor={C.accent}
            label="Devices"
            value={deviceCount || (isConnected ? '1' : '0')}
            sub="Registered"
          />
          <StatCard
            icon="shield-checkmark-outline"
            iconColor={apiOnline === true ? C.success : apiOnline === false ? C.error : C.textSub}
            label="API"
            value={apiOnline === null ? '…' : apiOnline ? 'OK' : 'ERR'}
            sub="Backend"
          />
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <QuickAction
            icon="videocam-outline"
            label="Live Feed"
            color={C.primary}
            onPress={() => navigation.navigate('Camera')}
          />
          <QuickAction
            icon="time-outline"
            label="History"
            color={C.accent}
            onPress={() => navigation.navigate('Detections')}
          />
          <QuickAction
            icon="eye-outline"
            label="Analyze"
            color={C.warning}
            onPress={() => navigation.navigate('Camera')}
            disabled={!deviceOnline}
          />
        </View>

        {/* ── Recent Detections ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Detections</Text>
          {detections.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Detections')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {detections.length > 0 ? (
          <View style={styles.card}>
            {detections.map((d, i) => (
              <React.Fragment key={d.id}>
                <DetectionItem item={d} />
                {i < detections.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="scan-outline" size={30} color={C.textSub} />
            </View>
            <Text style={styles.emptyTitle}>No detections yet</Text>
            <Text style={styles.emptyText}>
              Connect your ESP32 device and start scanning to see AI detection results here.
            </Text>
          </View>
        )}

        {/* ── System Status ── */}
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.card}>
          <StatusRow
            icon="server-outline"
            label="Backend API"
            statusText={apiOnline ? 'Online' : 'Offline'}
            ok={!!apiOnline}
            loading={apiOnline === null}
          />
          <View style={styles.divider} />
          <StatusRow
            icon={cameraMode === 'serial' ? 'link-outline' : 'hardware-chip-outline'}
            label={`ESP32 Camera (${cameraMode === 'serial' ? 'USB Serial' : cameraMode === 'wifi' ? 'Wi-Fi' : '—'})`}
            statusText={deviceOnline ? 'Connected' : cameraMode ? 'Waiting' : 'Service offline'}
            ok={deviceOnline}
          />
          <View style={styles.divider} />
          <StatusRow
            icon="volume-high-outline"
            label="Audio Engine"
            statusText="Ready"
            ok
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting:  { color: C.textSub, fontSize: 13, fontWeight: '500' },
  userName:  { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  connText:  { fontSize: 12, fontWeight: '600' },

  // Device card
  deviceCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  deviceLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceName:   { color: C.text, fontSize: 15, fontWeight: '700' },
  deviceStatus: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary + '15',
    borderWidth: 1,
    borderColor: C.primary + '40',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  scanBtnText: { color: C.primary, fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 28, marginHorizontal: -4 },

  // Sections
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  seeAll: { color: C.primary, fontSize: 13, fontWeight: '600', marginBottom: 12 },

  // Quick actions
  actionsRow: { flexDirection: 'row', marginBottom: 28, marginHorizontal: -4 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 46 },

  // Empty state
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.textSub + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText:  {
    color: C.textSub,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
