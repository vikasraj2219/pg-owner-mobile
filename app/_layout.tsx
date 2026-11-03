import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
  const { isLoading, isAuthenticated, isUnlocked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to Login
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 10);
      return () => clearTimeout(timer);
    } else if (isAuthenticated && inAuthGroup && isUnlocked) {
      // Redirect authenticated & unlocked users away from Auth screens to Tabs
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, isUnlocked, segments, router]);

  return (
    <View style={{ flex: 1 }}>
      {/* Root Navigator is ALWAYS mounted to preserve navigation state */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="checkin/[bedId]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="checkout/[tenantId]"
          options={{ presentation: 'modal', headerShown: true, title: 'Checkout Settlement' }}
        />
      </Stack>

      {/* Biometric Lock Screen Overlay */}
      {isAuthenticated && !isUnlocked && (
        <View style={StyleSheet.absoluteFill}>
          <BiometricLockScreen />
        </View>
      )}

      {/* Initial Session Recovery Loading Overlay */}
      {isLoading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color="#0A6C50" />
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
              <StatusBar style="dark" />
              <NavigationGuard />
            </PropertyProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
