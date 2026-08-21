import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen          from '../presentation/screens/LoginScreen';
import RegisterScreen       from '../presentation/screens/RegisterScreen';
import ForgotPasswordScreen from '../presentation/screens/ForgotPasswordScreen';
import ResetPasswordScreen  from '../presentation/screens/ResetPasswordScreen';
import BottomTabs           from './BottomTabs';
import { useStore }         from '../store/useStore';
import { Toast }            from '../presentation/components/Toast';

const Stack = createStackNavigator();

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.logoRing}>
        <Ionicons name="eye" size={34} color="#00AAFF" />
      </View>
      <Text style={styles.logoText}>AssistiveAI</Text>
      <Text style={styles.logoSub}>Your AI-powered vision companion</Text>
      <ActivityIndicator color="#00AAFF" size="small" style={styles.spinner} />
    </View>
  );
}

export default function AppNavigator() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isLoading = useStore((s) => s.isLoading);
  const initAuth = useStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <SplashScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animationEnabled: true,
              cardStyleInterpolator: ({ current }) => ({
                cardStyle: { opacity: current.progress },
              }),
            }}
          >
            {isLoggedIn ? (
              <Stack.Screen name="Main" component={BottomTabs} />
            ) : (
              <>
                <Stack.Screen name="Login"          component={LoginScreen} />
                <Stack.Screen name="Register"       component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}

      {/* Global toast — rendered above everything, available app-wide */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00AAFF14',
    borderWidth: 1.5,
    borderColor: '#00AAFF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#E8E8F0',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  logoSub: {
    color: '#6B7080',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  spinner: {
    marginTop: 8,
  },
});
