import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen          from '../presentation/screens/HomeScreen';
import DetectionsScreen    from '../presentation/screens/DetectionsScreen';
import CameraScreen        from '../presentation/screens/CameraScreen';
import ProfileScreen       from '../presentation/screens/ProfileScreen';
import EditProfileScreen   from '../presentation/screens/EditProfileScreen';
import SettingsScreen      from '../presentation/screens/SettingsScreen';
import SecurityScreen      from '../presentation/screens/SecurityScreen';
import NotificationsScreen from '../presentation/screens/NotificationsScreen';

const Tab           = createBottomTabNavigator();
const HomeStack     = createStackNavigator();
const CameraStack   = createStackNavigator();
const ProfileStack  = createStackNavigator();
const SettingsStack = createStackNavigator();

// ── Home stack: Home ↔ Detection History ──────────────────────────
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain"   component={HomeScreen} />
      <HomeStack.Screen name="Detections" component={DetectionsScreen} />
    </HomeStack.Navigator>
  );
}

// ── Camera stack: Live camera feed ────────────────────────────────
function CameraStackScreen() {
  return (
    <CameraStack.Navigator screenOptions={{ headerShown: false }}>
      <CameraStack.Screen name="CameraMain" component={CameraScreen} />
    </CameraStack.Navigator>
  );
}

// ── Profile stack: Profile ↔ Edit Profile ─────────────────────────
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Settings stack: Settings ↔ Security ↔ Notifications ───────────
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain"  component={SettingsScreen} />
      <SettingsStack.Screen name="Security"      component={SecurityScreen} />
      <SettingsStack.Screen name="Notifications" component={NotificationsScreen} />
    </SettingsStack.Navigator>
  );
}

// ── Tab icons ──────────────────────────────────────────────────────
const TAB_ICONS = {
  Home:     { active: 'home',          inactive: 'home-outline' },
  Camera:   { active: 'videocam',      inactive: 'videocam-outline' },
  Profile:  { active: 'person-circle', inactive: 'person-circle-outline' },
  Settings: { active: 'settings',      inactive: 'settings-outline' },
};

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00AAFF',
        tabBarInactiveTintColor: '#3D4460',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={22}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeStackScreen}     options={{ title: 'Home' }} />
      <Tab.Screen name="Camera"   component={CameraStackScreen}   options={{ title: 'Camera' }} />
      <Tab.Screen name="Profile"  component={ProfileStackScreen}  options={{ title: 'Profile' }} />
      <Tab.Screen name="Settings" component={SettingsStackScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D18',
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
    height: Platform.OS === 'ios' ? 86 : 66,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  iconWrap: {
    width: 48,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#00AAFF1A',
  },
});
