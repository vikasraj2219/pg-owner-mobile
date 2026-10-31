import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { PropertyProvider } from '../src/context/PropertyContext';
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';

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
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && isUnlocked) {
      // Redirect authenticated & unlocked users away from Auth screens to Tabs
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, isUnlocked, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F9FA]">
        <ActivityIndicator size="large" color="#0A6C50" />
      </View>
    );
  }

  // If authenticated but locked by biometric authentication
  if (isAuthenticated && !isUnlocked) {
    return <BiometricLockScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="checkin/[bedId]" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen
        name="checkout/[tenantId]"
        options={{ presentation: 'modal', headerShown: true, title: 'Checkout Settlement' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
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
  );
}
