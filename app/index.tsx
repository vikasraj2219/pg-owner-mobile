import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#0A6C50' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A6C50' }}>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
    </View>
  );
}
