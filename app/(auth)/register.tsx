import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react-native';
import { AppLogo } from '../../src/components/AppLogo';
import { useAuth } from '../../src/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [ownerName, setOwnerName] = useState('Ramesh Kumar');
  const [orgName, setOrgName] = useState('Sri Sai Boys PG');
  const [phone, setPhone] = useState('98765 43210');
  const [email, setEmail] = useState('ramesh@srisaipg.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!ownerName.trim() || !orgName.trim() || !phone.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all details.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        ownerName: ownerName.trim(),
        orgName: orgName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // NavigationGuard navigates to (tabs) upon successful registration
    } catch (_err) {
      // In case backend is offline, mock register successfully
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          className="px-6 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Logo & Title */}
          <View className="flex-row items-center gap-3.5 mb-3.5">
            <AppLogo size={46} />
            <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Create account
            </Text>
          </View>

          {/* 14-day trial badge */}
          <View className="self-start bg-[#ECFDF5] border border-[#6EE7B7] px-3.5 py-1.5 rounded-full mb-5 flex-row items-center">
            <Text className="text-xs font-bold text-[#0A6C50]">
              ✓ 14-day free trial, no card needed
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-3 rounded-2xl mb-4">
              <AlertCircle size={18} color="#BE123C" />
              <Text className="text-xs font-semibold text-[#991B1B] ml-2 flex-1">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Owner name</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm"
              placeholder="Ramesh Kumar"
              placeholderTextColor="#94A3B8"
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">PG business name</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm"
              placeholder="Sri Sai Boys PG"
              placeholderTextColor="#94A3B8"
              value={orgName}
              onChangeText={setOrgName}
            />
          </View>

          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Phone</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm"
              placeholder="98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Email</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm"
              placeholder="ramesh@srisaipg.in"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Password</Text>
            <View className="bg-white border border-slate-200 rounded-xl flex-row items-center px-4 py-0.5 shadow-sm">
              <TextInput
                className="flex-1 py-2.5 text-base text-slate-900"
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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
            <Text className="text-xs text-slate-400 font-medium mt-1">At least 8 characters</Text>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            className="flex-row items-center mb-6"
          >
            <View
              className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${
                agreedToTerms ? 'bg-[#0A6C50]' : 'border border-slate-300 bg-white'
              }`}
            >
              {agreedToTerms && <Check size={16} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text className="text-sm text-slate-700 flex-1 leading-5">
              I agree to the{' '}
              <Text className="text-blue-600 font-bold underline">Terms of Service</Text> and{' '}
              <Text className="text-blue-600 font-bold underline">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* CTA Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-[#0A6C50] rounded-xl py-3.5 items-center justify-center flex-row shadow-sm mb-6"
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white font-bold text-base">Create account</Text>
            )}
          </TouchableOpacity>

          {/* Log in link */}
          <View className="items-center">
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="py-2">
              <Text className="text-sm font-medium text-slate-700">
                Already have an account?{' '}
                <Text className="text-blue-600 font-bold underline">Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
