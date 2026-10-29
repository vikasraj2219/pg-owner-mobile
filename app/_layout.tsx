import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen
            name="checkin/[bedId]"
            options={{ presentation: 'modal', headerShown: true, title: 'Quick Check-in' }}
          />
          <Stack.Screen
            name="checkout/[tenantId]"
            options={{ presentation: 'modal', headerShown: true, title: 'Checkout Settlement' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
