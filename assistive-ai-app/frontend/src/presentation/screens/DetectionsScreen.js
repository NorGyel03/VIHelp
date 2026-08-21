import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import apiClient   from '../../data/api/apiClient';
import { timeAgo } from '../../utils/timeAgo';

const C = {
  bg:        '#0A0A0F',
  card:      '#12121C',
  border:    '#1E1E2E',
  primary:   '#00AAFF',
  text:      '#E8E8F0',
  textSub:   '#6B7080',
  success:   '#00D68F',
  warning:   '#FFAA00',
  error:     '#FF3D57',
};

const LIMIT = 20;

// ── Single detection row ─────────────────────────────────────────────
function DetectionRow({ item }) {
  const pct   = Math.round((item.confidence || 0) * 100);
  const color = pct >= 80 ? C.success : pct >= 50 ? C.warning : C.error;

  return (
    <View style={row.card}>
      {/* Left icon */}
      <View style={row.iconWrap}>
        <Ionicons name="scan-outline" size={18} color={C.primary} />
      </View>

      {/* Label + time */}
      <View style={row.content}>
        <Text style={row.label} numberOfLines={1}>{item.label}</Text>
        <Text style={row.time}>{timeAgo(item.created_at)}</Text>
      </View>

      {/* Confidence badge */}
      <View style={[row.badge, { backgroundColor: color + '18' }]}>
        <Text style={[row.badgeText, { color }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content:   { flex: 1, marginRight: 10 },
  label:     { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  time:      { color: C.textSub, fontSize: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});

// ── Empty state ───────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconBox}>
        <Ionicons name="scan-outline" size={36} color={C.textSub} />
      </View>
      <Text style={empty.title}>No detections yet</Text>
      <Text style={empty.sub}>
        Connect your ESP32 wearable and start scanning.{'\n'}
        Detection results will appear here in real time.
      </Text>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: C.textSub + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  sub:   { color: C.textSub, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

// ═══════════════════════════════════════════════════════════════════
export default function DetectionsScreen({ navigation }) {
  const [detections,  setDetections]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);
  const [error,       setError]       = useState(null);
  const offsetRef = React.useRef(0);

  const fetchDetections = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offsetRef.current;

    try {
      const res      = await apiClient.get(`/detections/me?limit=${LIMIT}&offset=${currentOffset}`);
      const newItems = res.data.detections || [];
      const total    = res.data.total;

      if (reset) {
        setDetections(newItems);
        offsetRef.current = newItems.length;
      } else {
        setDetections((prev) => [...prev, ...newItems]);
        offsetRef.current = currentOffset + newItems.length;
      }

      setHasMore(newItems.length === LIMIT);
      if (total != null) setTotalCount(total);
      else if (reset)    setTotalCount(newItems.length);
      setError(null);
    } catch {
      setError('Could not load detections. Pull to retry.');
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchDetections(true).finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetections(true);
    setRefreshing(false);
  };

  const onLoadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    await fetchDetections(false);
    setLoadingMore(false);
  };

  const renderItem = ({ item }) => <DetectionRow item={item} />;

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={C.primary} size="small" />
      </View>
    ) : null;

  const countLabel =
    totalCount > 0
      ? `${totalCount}${hasMore && totalCount === detections.length ? '+' : ''} records`
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Detection History</Text>
          {countLabel ? (
            <Text style={styles.headerCount}>{countLabel}</Text>
          ) : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centeredView}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Loading detections…</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredView}>
          <Ionicons name="cloud-offline-outline" size={44} color={C.textSub} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={detections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            detections.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  headerCount: { color: C.textSub, fontSize: 12, marginTop: 2 },

  // States
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { color: C.textSub, fontSize: 13, marginTop: 14 },
  errorText: {
    color: C.textSub,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: C.primary + '18',
    borderWidth: 1,
    borderColor: C.primary + '50',
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryText: { color: C.primary, fontSize: 14, fontWeight: '600' },

  // List
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 56,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
