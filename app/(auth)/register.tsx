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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: '#4F5330' }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Top Olive Section with Cyan Accent Circle */}
          <View style={{ backgroundColor: '#4F5330', overflow: 'hidden' }}>
            {/* Cyan Accent Circle */}
            <View
              style={{
                position: 'absolute',
                top: -55,
                right: -45,
                width: 260,
                height: 260,
                borderRadius: 130,
                backgroundColor: '#19D3E6',
              }}
            />

            {/* Header Content */}
            <View
              style={{
                paddingTop: Math.max(insets.top + 8, 44),
                paddingHorizontal: 24,
                paddingBottom: 22,
              }}
            >
              {/* Logo squircle card */}
              <View style={{ marginBottom: 18 }}>
                <AppLogo size={52} variant="nilaaya-card" />
              </View>

              {/* Bold headline */}
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: '800',
                  color: '#FFFFFF',
                  letterSpacing: -0.5,
                  marginBottom: 12,
                }}
              >
                Create account
              </Text>

              {/* 14-day free trial badge */}
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.45)',
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 9999,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}
                >
                  ✓ 14-day free trial, no card needed
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom White Sheet */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {/* Global Error Banner */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFF1F2',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={18} color="#BE123C" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#991B1B',
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Form Field: Owner name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                Owner name
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.ownerName ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: '#0C192B',
                }}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#8E98A0"
                value={ownerName}
                onChangeText={text => {
                  setOwnerName(text);
                  clearFieldError('ownerName');
                }}
                autoCapitalize="words"
              />
              {fieldErrors.ownerName && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {fieldErrors.ownerName}
                </Text>
              )}
            </View>

            {/* Form Field: PG Business name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                PG business name
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.orgName ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: '#0C192B',
                }}
                placeholder="e.g. Sri Sai Boys PG"
                placeholderTextColor="#8E98A0"
                value={orgName}
                onChangeText={text => {
                  setOrgName(text);
                  clearFieldError('orgName');
                }}
              />
              {fieldErrors.orgName && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {fieldErrors.orgName}
                </Text>
              )}
            </View>

            {/* Form Field: Phone number */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                Phone number
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.phone ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: '#0C192B',
                }}
                placeholder="10-digit mobile (e.g. 9876543210)"
                placeholderTextColor="#8E98A0"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={text => {
                  setPhone(text);
                  clearFieldError('phone');
                }}
              />
              {fieldErrors.phone && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {fieldErrors.phone}
                </Text>
              )}
            </View>

            {/* Form Field: Email address */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                Email address
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.email ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: '#0C192B',
                }}
                placeholder="e.g. owner@example.com"
                placeholderTextColor="#8E98A0"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  clearFieldError('email');
                }}
              />
              {fieldErrors.email && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {fieldErrors.email}
                </Text>
              )}
            </View>

            {/* Form Field: Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.password ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: '#0C192B',
                    paddingVertical: 0,
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#8E98A0"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    clearFieldError('password');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#657080" />
                  ) : (
                    <Eye size={20} color="#657080" />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {fieldErrors.password}
                </Text>
              )}
            </View>

            {/* Form Field: Confirm password */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                Confirm password
              </Text>
              <View
                style={{
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: fieldErrors.confirmPassword ? '#BE123C' : '#E5DDCD',
                  borderRadius: 14,
                  height: 52,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: '#0C192B',
                    paddingVertical: 0,
                  }}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#8E98A0"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    clearFieldError('confirmPassword');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#657080" />
                  ) : (
                    <Eye size={20} color="#657080" />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#BE123C',
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: agreedToTerms ? '#19D3E6' : '#FFFFFF',
                  borderWidth: agreedToTerms ? 0 : 1.5,
                  borderColor: fieldErrors.agreedToTerms ? '#BE123C' : '#CBD5E1',
                }}
              >
                {agreedToTerms && <Check size={16} color="#0C192B" strokeWidth={3} />}
              </View>
              <Text style={{ fontSize: 13, color: '#0C192B', flex: 1, lineHeight: 18 }}>
                I agree to the{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    textDecorationLine: 'underline',
                    color: '#0C192B',
                  }}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    textDecorationLine: 'underline',
                    color: '#0C192B',
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={{
                backgroundColor: '#4F5330',
                borderRadius: 9999,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                shadowColor: '#4F5330',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
                marginBottom: 24,
              }}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: 16,
                      marginLeft: 8,
                    }}
                  >
                    Creating account…
                  </Text>
                </>
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                  Create account
                </Text>
              )}
            </TouchableOpacity>

            {/* Log in link */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{ paddingVertical: 6 }}
              >
                <Text style={{ fontSize: 14, color: '#0C192B', fontWeight: '500' }}>
                  Already have an account?{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                      color: '#0C192B',
                    }}
                  >
                    Log in
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
