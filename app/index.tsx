import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#F8F9FA' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
    </View>
  );
}
