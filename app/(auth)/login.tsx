import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Fingerprint, AlertCircle } from 'lucide-react-native';
import { AppLogo } from '../../src/components/AppLogo';
import { useAuth } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, unlockWithBiometrics } = useAuth();

  const [identifier, setIdentifier] = useState('98765 43210');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Incorrect password. 2 attempts left.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ identifier: identifier.trim(), password });
      // NavigationGuard navigates to (tabs) upon successful login
    } catch (_err) {
      // In case backend is not running or incorrect password
      setErrorMessage('Incorrect password. 2 attempts left.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricAuth = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          className="px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Top Logo */}
            <View className="mb-6">
              <AppLogo size={46} />
            </View>

            {/* Title & Subtitle */}
            <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
              Welcome back
            </Text>
            <Text className="text-base text-slate-500 font-medium mb-6">
              Log in to manage your PG
            </Text>

            {/* Error Banner (Page 7 design) */}
            {errorMessage && (
              <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-3 rounded-2xl mb-5">
                <AlertCircle size={18} color="#BE123C" />
                <Text className="text-sm font-semibold text-[#991B1B] ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Form Fields */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">Phone or email</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-900 shadow-sm"
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                value={identifier}
                onChangeText={text => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-2">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">Password</Text>
              <View
                className={`bg-white border rounded-xl flex-row items-center px-4 py-1 shadow-sm ${
                  errorMessage ? 'border-[#BE123C]' : 'border-slate-200'
                }`}
              >
                <TextInput
                  className="flex-1 py-2.5 text-base text-slate-900"
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            <View className="items-end mb-6">
              <TouchableOpacity>
                <Text className="text-blue-600 font-bold text-sm">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Log in CTA (Page 6 & 8) */}
            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-[#0A6C50] rounded-xl py-3.5 items-center justify-center flex-row shadow-sm"
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-bold text-base ml-2">Logging in…</Text>
                </>
              ) : (
                <Text className="text-white font-bold text-base">Log in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-slate-200" />
              <Text className="mx-4 text-xs text-slate-400 font-medium">or</Text>
              <View className="flex-1 h-[1px] bg-slate-200" />
            </View>

            {/* Fingerprint unlock */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-white border border-[#0A6C50] py-3.5 rounded-xl items-center justify-center flex-row shadow-sm"
              onPress={handleBiometricAuth}
            >
              <Fingerprint size={22} color="#0A6C50" />
              <Text className="text-[#0A6C50] font-bold text-base ml-2.5">
                Unlock with fingerprint
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Register Link */}
          <View className="items-center py-4 mt-6">
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} className="py-2">
              <Text className="text-sm font-medium text-slate-700">
                New to PG Manager?{' '}
                <Text className="text-blue-600 font-bold underline">Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
