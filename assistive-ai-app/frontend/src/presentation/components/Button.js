import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VARIANTS = {
  primary: {
    bg: '#00AAFF',
    border: '#00AAFF',
    text: '#FFFFFF',
    loaderColor: '#FFFFFF',
  },
  secondary: {
    bg: 'transparent',
    border: '#00AAFF',
    text: '#00AAFF',
    loaderColor: '#00AAFF',
  },
  danger: {
    bg: '#FF3D5715',
    border: '#FF3D5760',
    text: '#FF3D57',
    loaderColor: '#FF3D57',
  },
  ghost: {
    bg: 'transparent',
    border: 'transparent',
    text: '#00AAFF',
    loaderColor: '#00AAFF',
  },
};

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
  textStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.loaderColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={v.text}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.text, { color: v.text }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
