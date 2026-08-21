import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileApi, logoutApi } from '../data/repositories/authRepository';

const mapUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name || '',
  middleName: u.middle_name || '',
  lastName: u.last_name || '',
  phone: u.phone || '',
  occupation: u.occupation || '',
  dob: u.date_of_birth || '',
  address: u.address || '',
  profileImage: u.profile_image_url || null,
  createdAt: u.created_at,
});

export const useStore = create((set) => ({
  // ─── Auth state ──────────────────────────────────────────────────
  isLoggedIn: false,
  isLoading: true,
  user: null,

  // ─── Device / AI state ───────────────────────────────────────────
  isConnected: false,
  device: null,
  aiResponse: null,

  // ─── Camera state ───────────────────────────────────────────────
  cameraConnected: false,
  cameraMode: null,        // "serial" | "wifi" | null (unknown)
  cameraSource: null,      // e.g. "serial:COM5" or "http://..."
  liveDetections: [],

  // ─── Auth actions ────────────────────────────────────────────────

  login: (user) =>
    set({ isLoggedIn: true, user }),

  logout: async () => {
    try {
      await logoutApi();
    } catch {}
    await AsyncStorage.multiRemove(['auth_token', 'user', 'isLoggedIn']);
    set({ isLoggedIn: false, user: null });
  },

  initAuth: async () => {
    try {
      const [[, token], [, loggedIn], [, userJson]] = await AsyncStorage.multiGet([
        'auth_token',
        'isLoggedIn',
        'user',
      ]);
      const storedUser = userJson ? JSON.parse(userJson) : null;

      if (token && loggedIn === 'true' && storedUser) {
        // Immediately show app with stored user, then refresh in background
        set({ isLoggedIn: true, user: storedUser });

        getProfileApi()
          .then((data) => {
            const fresh = mapUser(data.user);
            AsyncStorage.setItem('user', JSON.stringify(fresh));
            set({ user: fresh });
          })
          .catch(() => {
            // Token might be expired — force re-login
            AsyncStorage.multiRemove(['auth_token', 'user', 'isLoggedIn']);
            set({ isLoggedIn: false, user: null });
          });
      }
    } catch {
      // ignore storage errors
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const data = await getProfileApi();
      const fresh = mapUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(fresh));
      set({ user: fresh });
    } catch {}
  },

  // ─── User actions ────────────────────────────────────────────────
  setUser: (user) => set({ user }),

  // ─── Device actions ──────────────────────────────────────────────
  setConnection: (status) => set({ isConnected: status }),
  setDevice: (device) => set({ device }),

  // ─── AI actions ──────────────────────────────────────────────────
  setAIResponse: (aiResponse) => set({ aiResponse }),

  // ─── Camera actions ────────────────────────────────────────────
  setCameraConnected: (status) => set({ cameraConnected: status }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setCameraSource: (source) => set({ cameraSource: source }),
  setLiveDetections: (detections) => set({ liveDetections: detections }),
}));
