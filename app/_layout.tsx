import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// Prevent native splash screen from hiding until app is ready (Instagram-style)
SplashScreen.preventAutoHideAsync().catch(() => {});
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { PropertyProvider } from '../src/context/PropertyContext';
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (v5)
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

function NavigationGuard() {
  const { isLoading, isAuthenticated, isUnlocked, isBiometricEnabled } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === '(auth)';

  // Global safety fallback: ensures splash screen is always dismissed even in unexpected error states
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3500);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !inAuthGroup && segments[0] !== undefined) {
      // Direct unauthenticated users to Login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Direct authenticated users away from Auth screens to Tabs
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, inAuthGroup, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Root Navigator */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8F9FA' },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: '#F8F9FA' } }} />
        <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: '#F8F9FA' } }} />
        <Stack.Screen name="(auth)" options={{ contentStyle: { backgroundColor: '#F8F9FA' } }} />
        <Stack.Screen
          name="checkin/[bedId]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="checkout/[tenantId]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen name="tenant/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen
          name="tenant/edit/[id]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen name="tenants/add" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="subscription" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="receipt/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="reminder/[id]" options={{ presentation: 'card', headerShown: false }} />
      </Stack>

      {/* Biometric Lock Screen Overlay - only if explicitly enabled by user in Settings */}
      {isAuthenticated && isBiometricEnabled && !isUnlocked && (
        <View style={StyleSheet.absoluteFill}>
          <BiometricLockScreen />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <AuthProvider>
            <PropertyProvider>
              <StatusBar style="light" />
              <NavigationGuard />
            </PropertyProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
