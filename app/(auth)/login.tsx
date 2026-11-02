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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Fingerprint, AlertCircle } from 'lucide-react-native';
import { AppLogo } from '../../src/components/AppLogo';
import { useAuth } from '../../src/hooks/useAuth';
import {
  validateIdentifier,
  validatePassword,
  getApiErrorMessage,
} from '../../src/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithDemo, loginWithBiometrics } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleLogin = async () => {
    // 1. Reset existing errors
    setErrorMessage(null);
    const newFieldErrors: { identifier?: string; password?: string } = {};

    // 2. Validate identifier (Phone or Email)
    const idValidation = validateIdentifier(identifier);
    if (!idValidation.isValid) {
      newFieldErrors.identifier = idValidation.error;
    }

    // 3. Validate password
    const pwdValidation = validatePassword(password, 6);
    if (!pwdValidation.isValid) {
      newFieldErrors.password = pwdValidation.error;
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorMessage(
        newFieldErrors.identifier || newFieldErrors.password || 'Please check the required fields.',
      );
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // Send normalized identifier (10-digit phone or lowercased email)
      await login({
        identifier: idValidation.normalized,
        password,
      });
      // NavigationGuard redirects to (tabs) upon successful login
    } catch (err: unknown) {
      const parsedMessage = getApiErrorMessage(err);
      setErrorMessage(parsedMessage);
      setFieldErrors({
        identifier: ' ',
        password: ' ',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setIsDemoSubmitting(true);
    try {
      await loginWithDemo();
    } catch (err: unknown) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  const handleBiometricAuth = async () => {
    setErrorMessage(null);
    const result = await loginWithBiometrics();
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Biometric Login',
        result.message || 'Biometric authentication was cancelled or not recognized.',
      );
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Please contact your PG administrator or email support@pgowner.in with your registered phone number or email to reset your credentials.',
      [{ text: 'OK' }],
    );
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

            {/* Global Error Banner */}
            {errorMessage && (
              <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-3 rounded-2xl mb-5">
                <AlertCircle size={18} color="#BE123C" />
                <Text className="text-sm font-semibold text-[#991B1B] ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Form Field: Identifier */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">
                Phone number or email
              </Text>
              <TextInput
                className={`bg-white border rounded-xl px-4 py-3.5 text-base text-slate-900 shadow-sm ${
                  fieldErrors.identifier ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
                }`}
                placeholder="e.g. 9876543210 or owner@example.com"
                placeholderTextColor="#94A3B8"
                value={identifier}
                onChangeText={text => {
                  setIdentifier(text);
                  if (fieldErrors.identifier || errorMessage) {
                    setFieldErrors(prev => ({ ...prev, identifier: undefined }));
                    setErrorMessage(null);
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {fieldErrors.identifier && fieldErrors.identifier !== ' ' && (
                <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                  {fieldErrors.identifier}
                </Text>
              )}
            </View>

            {/* Form Field: Password */}
            <View className="mb-2">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">Password</Text>
              <View
                className={`bg-white border rounded-xl flex-row items-center px-4 py-1 shadow-sm ${
                  fieldErrors.password ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <TextInput
                  className="flex-1 py-2.5 text-base text-slate-900"
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (fieldErrors.password || errorMessage) {
                      setFieldErrors(prev => ({ ...prev, password: undefined }));
                      setErrorMessage(null);
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
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
              {fieldErrors.password && fieldErrors.password !== ' ' && (
                <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                  {fieldErrors.password}
                </Text>
              )}
            </View>

            {/* Forgot password */}
            <View className="items-end mb-6">
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text className="text-blue-600 font-bold text-sm">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Log in CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-[#0A6C50] rounded-xl py-3.5 items-center justify-center flex-row shadow-sm"
              onPress={handleLogin}
              disabled={isSubmitting || isDemoSubmitting}
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
              disabled={isSubmitting || isDemoSubmitting}
            >
              <Fingerprint size={22} color="#0A6C50" />
              <Text className="text-[#0A6C50] font-bold text-base ml-2.5">
                Unlock with biometrics
              </Text>
            </TouchableOpacity>

            {/* Testing Demo Account Shortcut */}
            <View className="mt-5 items-center">
              <TouchableOpacity
                onPress={handleDemoLogin}
                disabled={isSubmitting || isDemoSubmitting}
                className="py-2 px-3 rounded-lg bg-slate-100 border border-slate-200/80 flex-row items-center"
              >
                {isDemoSubmitting ? (
                  <ActivityIndicator size="small" color="#475569" />
                ) : (
                  <Text className="text-xs font-semibold text-slate-600">
                    Testing offline?{' '}
                    <Text className="text-[#0A6C50] font-bold">Try Demo Account</Text>
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
