import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { updateUser } from '../../utils/authStorage';
import { useStore } from '../../store/useStore';
import { Toast } from '../components/Toast';

const C = {
  bg: '#0A0A0F',
  card: '#12121C',
  border: '#1E1E2E',
  primary: '#00AAFF',
  text: '#E8E8F0',
  textSub: '#6B7080',
  error: '#FF3D57',
  success: '#00D68F',
  warning: '#FFAA00',
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Ionicons name={icon} size={15} color={C.primary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: { flex: 1 },
  label: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
});

// ── Field definitions for profile completion ─────────────────────────
const COMPLETION_FIELDS = [
  { key: 'firstName',    label: 'First Name',     icon: 'person-outline',    editField: 'Personal Information' },
  { key: 'lastName',     label: 'Last Name',      icon: 'person-outline',    editField: 'Personal Information' },
  { key: 'phone',        label: 'Phone Number',   icon: 'call-outline',      editField: 'Contact Details' },
  { key: 'occupation',   label: 'Occupation',     icon: 'briefcase-outline', editField: 'Additional Info' },
  { key: 'dob',          label: 'Date of Birth',  icon: 'calendar-outline',  editField: 'Additional Info' },
  { key: 'address',      label: 'Address',        icon: 'location-outline',  editField: 'Additional Info' },
  { key: 'profileImage', label: 'Profile Photo',  icon: 'camera-outline',    editField: 'photo' },
];

export default function ProfileScreen({ navigation }) {
  const user = useStore((s) => s.user);
  const storeLogout = useStore((s) => s.logout);
  const setUser = useStore((s) => s.setUser);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const [completionModal, setCompletionModal] = useState(false);

  // Refresh profile data from backend every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Photo library access is needed to update your photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      try {
        const updated = await updateUser({ profileImage: result.assets[0].uri });
        setUser(updated);
        Toast.success('Profile photo updated!');
      } catch (e) {
        Toast.error('Could not update profile photo.');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => storeLogout() },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={{ color: C.textSub, fontSize: 14 }}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName =
    [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'User';
  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';

  // Member since
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Profile completion
  const profileFields = ['firstName', 'lastName', 'phone', 'occupation', 'dob', 'address', 'profileImage'];
  const filledCount   = profileFields.filter((f) => !!user[f]).length;
  const completionPct = Math.round((filledCount / profileFields.length) * 100);
  const completionColor =
    completionPct >= 85 ? C.success : completionPct >= 50 ? C.primary : C.warning;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Bar ── */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={18} color={C.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Avatar Section ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.85}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.badgeRow}>
            {user.occupation ? (
              <View style={styles.badge}>
                <Ionicons name="briefcase-outline" size={11} color={C.primary} />
                <Text style={styles.badgeText}>{user.occupation}</Text>
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: C.success + '14', borderColor: C.success + '30' }]}>
              <View style={[styles.dot, { backgroundColor: C.success }]} />
              <Text style={[styles.badgeText, { color: C.success }]}>Active</Text>
            </View>
          </View>

          {memberSince ? (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          ) : null}
        </View>

        {/* ── Profile Completion (tappable) ── */}
        {completionPct < 100 && (
          <TouchableOpacity
            style={styles.completionCard}
            onPress={() => setCompletionModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Profile Completion</Text>
              <View style={styles.completionRight}>
                <Text style={[styles.completionPct, { color: completionColor }]}>
                  {completionPct}%
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.textSub} style={{ marginLeft: 4 }} />
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completionPct}%`, backgroundColor: completionColor },
                ]}
              />
            </View>
            <Text style={styles.completionHint}>
              {completionPct < 50
                ? "Tap to see what's missing from your profile"
                : "Almost complete — tap to see what's left"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Completion Modal ── */}
        <Modal
          visible={completionModal}
          animationType="slide"
          transparent
          onRequestClose={() => setCompletionModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setCompletionModal(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              {/* Handle bar */}
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>Complete Your Profile</Text>
              <Text style={styles.modalSub}>
                {filledCount}/{COMPLETION_FIELDS.length} fields completed
              </Text>

              {/* Fields list */}
              {COMPLETION_FIELDS.map((field) => {
                const filled = !!user[field.key];
                return (
                  <View key={field.key} style={[styles.modalRow, filled && styles.modalRowDone]}>
                    <View style={[styles.modalIconBox, { backgroundColor: filled ? C.success + '18' : C.primary + '14' }]}>
                      <Ionicons
                        name={filled ? 'checkmark-circle' : field.icon}
                        size={17}
                        color={filled ? C.success : C.primary}
                      />
                    </View>
                    <Text style={[styles.modalField, filled && styles.modalFieldDone]}>
                      {field.label}
                    </Text>
                    {filled ? (
                      <Text style={styles.doneTag}>Done</Text>
                    ) : field.key === 'profileImage' ? (
                      <TouchableOpacity
                        style={styles.fillBtn}
                        onPress={() => { setCompletionModal(false); setTimeout(pickImage, 300); }}
                      >
                        <Text style={styles.fillBtnText}>Add Photo</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.fillBtn}
                        onPress={() => { setCompletionModal(false); navigation.navigate('EditProfile'); }}
                      >
                        <Text style={styles.fillBtnText}>Fill In</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setCompletionModal(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Personal Info Card ── */}
        <View style={styles.cardWrap}>
          <Text style={styles.cardLabel}>Personal Information</Text>
          <View style={styles.card}>
            <InfoRow icon="mail-outline" label="Email Address" value={user.email} />
            {user.phone ? <><View style={styles.divider} /><InfoRow icon="call-outline" label="Phone" value={user.phone} /></> : null}
            {user.dob ? <><View style={styles.divider} /><InfoRow icon="calendar-outline" label="Date of Birth" value={user.dob} /></> : null}
            {user.occupation ? <><View style={styles.divider} /><InfoRow icon="briefcase-outline" label="Occupation" value={user.occupation} /></> : null}
            {user.address ? <><View style={styles.divider} /><InfoRow icon="location-outline" label="Address" value={user.address} /></> : null}

            {!user.phone && !user.dob && !user.occupation && !user.address ? (
              <TouchableOpacity
                style={styles.completeProfile}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Ionicons name="add-circle-outline" size={16} color={C.primary} />
                <Text style={styles.completeProfileText}>Complete your profile</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 56,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary + '14',
    borderWidth: 1,
    borderColor: C.primary + '40',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editBtnText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: C.primary + '60',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.primary + '18',
    borderWidth: 3,
    borderColor: C.primary + '60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: C.primary,
    fontSize: 36,
    fontWeight: '800',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: C.bg,
  },
  name: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    color: C.textSub,
    fontSize: 13,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary + '14',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.primary + '30',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  memberSince: {
    color: C.textSub,
    fontSize: 12,
    marginTop: 4,
  },
  // Completion bar
  completionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  completionPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completionHint: {
    color: C.textSub,
    fontSize: 11,
    lineHeight: 16,
  },

  cardWrap: {
    marginBottom: 16,
  },
  cardLabel: {
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
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 48,
  },
  completeProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  completeProfileText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#14141F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: C.textSub,
    fontSize: 13,
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalRowDone: { opacity: 0.55 },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalField: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalFieldDone: { color: C.textSub },
  doneTag: {
    color: C.success,
    fontSize: 12,
    fontWeight: '700',
  },
  fillBtn: {
    backgroundColor: C.primary + '18',
    borderWidth: 1,
    borderColor: C.primary + '50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  fillBtnText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalClose: {
    marginTop: 20,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.error + '12',
    borderWidth: 1,
    borderColor: C.error + '40',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  logoutText: {
    color: C.error,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
