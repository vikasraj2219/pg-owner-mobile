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
import {
  validateName,
  validatePhone,
  validateEmail,
  validatePassword,
  getApiErrorMessage,
} from '../../src/utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [ownerName, setOwnerName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    ownerName?: string;
    orgName?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreedToTerms?: string;
  }>({});

  const handleRegister = async () => {
    setErrorMessage(null);
    const newFieldErrors: typeof fieldErrors = {};

    // 1. Validate Owner Name
    const nameResult = validateName(ownerName, 'Owner name');
    if (!nameResult.isValid) {
      newFieldErrors.ownerName = nameResult.error;
    }

    // 2. Validate PG Business Name
    const orgResult = validateName(orgName, 'PG business name');
    if (!orgResult.isValid) {
      newFieldErrors.orgName = orgResult.error;
    }

    // 3. Validate Phone Number
    const phoneResult = validatePhone(phone);
    if (!phoneResult.isValid) {
      newFieldErrors.phone = phoneResult.error;
    }

    // 4. Validate Email Address
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      newFieldErrors.email = emailResult.error;
    }

    // 5. Validate Password
    const passwordResult = validatePassword(password, 8);
    if (!passwordResult.isValid) {
      newFieldErrors.password = passwordResult.error;
    } else if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    // 6. Check Terms Agreement
    if (!agreedToTerms) {
      newFieldErrors.agreedToTerms = 'You must agree to the Terms of Service & Privacy Policy.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorMessage(
        newFieldErrors.ownerName ||
          newFieldErrors.orgName ||
          newFieldErrors.phone ||
          newFieldErrors.email ||
          newFieldErrors.password ||
          newFieldErrors.confirmPassword ||
          newFieldErrors.agreedToTerms ||
          'Please complete all required fields.',
      );
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register({
        ownerName: ownerName.trim(),
        orgName: orgName.trim(),
        phone: phoneResult.normalized,
        email: email.trim().toLowerCase(),
        password,
      });
      // NavigationGuard navigates to (tabs) upon successful registration
    } catch (err: unknown) {
      const parsedMessage = getApiErrorMessage(err);
      setErrorMessage(parsedMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    if (fieldErrors[field] || errorMessage) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
      setErrorMessage(null);
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

          {/* Form Field: Owner name */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Owner name</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm ${
                fieldErrors.ownerName ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94A3B8"
              value={ownerName}
              onChangeText={text => {
                setOwnerName(text);
                clearFieldError('ownerName');
              }}
              autoCapitalize="words"
            />
            {fieldErrors.ownerName && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.ownerName}
              </Text>
            )}
          </View>

          {/* Form Field: PG Business name */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">PG business name</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm ${
                fieldErrors.orgName ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
              placeholder="e.g. Sri Sai Boys PG"
              placeholderTextColor="#94A3B8"
              value={orgName}
              onChangeText={text => {
                setOrgName(text);
                clearFieldError('orgName');
              }}
            />
            {fieldErrors.orgName && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.orgName}
              </Text>
            )}
          </View>

          {/* Form Field: Phone */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Phone number</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm ${
                fieldErrors.phone ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
              placeholder="10-digit mobile (e.g. 9876543210)"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={text => {
                setPhone(text);
                clearFieldError('phone');
              }}
            />
            {fieldErrors.phone && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.phone}
              </Text>
            )}
          </View>

          {/* Form Field: Email */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Email address</Text>
            <TextInput
              className={`bg-white border rounded-xl px-4 py-3 text-base text-slate-900 shadow-sm ${
                fieldErrors.email ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
              placeholder="e.g. owner@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={text => {
                setEmail(text);
                clearFieldError('email');
              }}
            />
            {fieldErrors.email && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.email}
              </Text>
            )}
          </View>

          {/* Form Field: Password */}
          <View className="mb-3.5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Password</Text>
            <View
              className={`bg-white border rounded-xl flex-row items-center px-4 py-0.5 shadow-sm ${
                fieldErrors.password ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <TextInput
                className="flex-1 py-2.5 text-base text-slate-900"
                placeholder="At least 8 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  clearFieldError('password');
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
            {fieldErrors.password && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.password}
              </Text>
            )}
          </View>

          {/* Form Field: Confirm Password */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</Text>
            <View
              className={`bg-white border rounded-xl flex-row items-center px-4 py-0.5 shadow-sm ${
                fieldErrors.confirmPassword ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <TextInput
                className="flex-1 py-2.5 text-base text-slate-900"
                placeholder="Re-enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  clearFieldError('confirmPassword');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#64748B" />
                ) : (
                  <Eye size={20} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmPassword && (
              <Text className="text-xs font-semibold text-[#BE123C] mt-1 ml-1">
                {fieldErrors.confirmPassword}
              </Text>
            )}
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAgreedToTerms(!agreedToTerms);
              clearFieldError('agreedToTerms');
            }}
            className="flex-row items-center mb-6"
          >
            <View
              className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${
                agreedToTerms
                  ? 'bg-[#0A6C50]'
                  : fieldErrors.agreedToTerms
                    ? 'border-2 border-[#BE123C] bg-white'
                    : 'border border-slate-300 bg-white'
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
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-white font-bold text-base ml-2">Creating account…</Text>
              </>
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
