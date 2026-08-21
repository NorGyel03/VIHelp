import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Global ref — any module can call Toast.success() etc.
export const toastRef = { current: null };

const COLORS = {
  success: '#00D68F',
  error:   '#FF3D57',
  info:    '#00AAFF',
  warning: '#FFAA00',
};

const ICONS = {
  success: 'checkmark-circle',
  error:   'alert-circle',
  info:    'information-circle',
  warning: 'warning',
};

export function Toast() {
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timer      = useRef(null);

  const [visible, setVisible] = useState(false);
  const [config, setConfig]   = useState({ message: '', type: 'info' });

  const show = useCallback(
    (message, type = 'info', duration = 2800) => {
      if (timer.current) clearTimeout(timer.current);

      setConfig({ message, type });
      setVisible(true);

      // Reset position before animating in
      translateY.setValue(-140);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -140,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, duration);
    },
    [translateY, opacity]
  );

  // Self-register so any module can call Toast.success() etc.
  useEffect(() => {
    toastRef.current = { show };
    return () => {
      toastRef.current = null;
    };
  }, [show]);

  if (!visible) return null;

  const color = COLORS[config.type] || COLORS.info;
  const icon  = ICONS[config.type]  || ICONS.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { transform: [{ translateY }], opacity, borderLeftColor: color },
      ]}
    >
      <Ionicons name={icon} size={19} color={color} />
      <Text style={styles.text} numberOfLines={2}>
        {config.message}
      </Text>
    </Animated.View>
  );
}

// ── Static convenience methods ──────────────────────────────────────
Toast.success = (msg, duration) => toastRef.current?.show(msg, 'success', duration);
Toast.error   = (msg, duration) => toastRef.current?.show(msg, 'error',   duration);
Toast.info    = (msg, duration) => toastRef.current?.show(msg, 'info',    duration);
Toast.warning = (msg, duration) => toastRef.current?.show(msg, 'warning', duration);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    left: 16,
    right: 16,
    backgroundColor: '#1C1C2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 14,
    zIndex: 9999,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  text: {
    color: '#E8E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
