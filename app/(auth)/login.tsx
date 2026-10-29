import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Stage 1 implementation: API call and JWT storage
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center p-6">
      <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</Text>
        <Text className="text-sm text-slate-500 mb-6">Sign in to manage your PGs and tenants</Text>

        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">
            Email or Phone
          </Text>
          <TextInput
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
            placeholder="e.g. owner@example.com"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
        </View>

        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Password</Text>
          <TextInput
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-lg py-3 items-center mb-4"
          onPress={handleLogin}
        >
          <Text className="text-white font-semibold text-base">Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center" onPress={() => router.push('/(auth)/register')}>
          <Text className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Text className="text-primary-600 font-semibold">Start 14-Day Free Trial</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
