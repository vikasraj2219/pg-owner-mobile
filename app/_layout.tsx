import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <NavigationGuard />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
