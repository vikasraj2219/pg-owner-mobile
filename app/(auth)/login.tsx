import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import axios from 'axios';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/phone and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ identifier: identifier.trim(), password });
      // NavigationGuard handles redirecting to (tabs) automatically
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
        setErrorMessage(msg);
      } else {
        Alert.alert('Login Error', 'Unable to connect to server. Please check your network.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center p-6">
      <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</Text>
        <Text className="text-sm text-slate-500 mb-6">Sign in to manage your PGs and tenants</Text>

        {errorMessage && (
          <View className="bg-rose-50 border border-rose-200 p-3 rounded-lg mb-4">
            <Text className="text-xs text-rose-700 font-medium">{errorMessage}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">
            Email or Phone Number
          </Text>
          <TextInput
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
            placeholder="e.g. owner@example.com or 10-digit phone"
            value={identifier}
            onChangeText={text => {
              setIdentifier(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Password</Text>
          <TextInput
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={text => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
          />
        </View>

        <TouchableOpacity
          className={`bg-primary-600 rounded-lg py-3 items-center mb-4 ${
            isSubmitting ? 'opacity-70' : ''
          }`}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center"
          onPress={() => router.push('/(auth)/register')}
          disabled={isSubmitting}
        >
          <Text className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Text className="text-primary-600 font-semibold">Start 14-Day Free Trial</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
