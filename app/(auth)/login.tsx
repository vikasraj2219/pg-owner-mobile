import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Eye, EyeOff, Fingerprint, AlertCircle } from 'lucide-react-native';
import { AppLogo } from '../../src/components/AppLogo';
import { LoginSkeleton } from '../../src/components/Skeleton';
import { useAuth } from '../../src/hooks/useAuth';
import {
  validateIdentifier,
  validatePassword,
  getApiErrorMessage,
} from '../../src/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithBiometrics, isBiometricEnabled, isLoading: isAuthLoading } = useAuth();

  const [initialSkeletonActive, setInitialSkeletonActive] = useState(true);
  const splashDismissedRef = useRef(false);

  // Instagram-style smooth splash transition: dismiss native splash once initial layout is ready
  const handleLayout = useCallback(() => {
    if (!splashDismissedRef.current) {
      splashDismissedRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Keep skeleton visible for 650ms so user clearly sees the smooth loading pulse on open/reopen
    const timer = setTimeout(() => {
      setInitialSkeletonActive(false);
    }, 650);

    return () => clearTimeout(timer);
  }, []);

  const showSkeleton = initialSkeletonActive || isAuthLoading;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleBiometricAuth = async () => {
    setErrorMessage(null);
    if (!isBiometricEnabled) {
      Alert.alert(
        'Biometrics Not Configured',
        'Biometric authentication can be enabled in Settings after signing in with your password.',
      );
      return;
    }
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
    <View style={{ flex: 1, backgroundColor: '#4F5330' }} onLayout={handleLayout}>
      <StatusBar style="light" />
      {showSkeleton ? (
        <LoginSkeleton />
      ) : (
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
                  paddingBottom: 28,
                }}
              >
                {/* Logo squircle card */}
                <View style={{ marginBottom: 20 }}>
                  <AppLogo size={52} variant="nilaaya-card" />
                </View>

                {/* Bold headline */}
                <Text
                  style={{
                    fontSize: 34,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    lineHeight: 42,
                    letterSpacing: -0.5,
                  }}
                >
                  Run your PG,{'\n'}effortlessly.
                </Text>
              </View>
            </View>

            {/* Bottom White Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: Math.max(insets.bottom, 20),
                justifyContent: 'space-between',
              }}
            >
              <View>
                {/* Title */}
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: '#0C192B',
                    marginBottom: 20,
                    letterSpacing: -0.3,
                  }}
                >
                  Log in
                </Text>

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
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#991B1B',
                        marginLeft: 10,
                        flex: 1,
                      }}
                    >
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* Form Field: Phone number or email */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#0C192B',
                      marginBottom: 8,
                    }}
                  >
                    Phone number or email
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: '#FAF7F2',
                      borderWidth: 1,
                      borderColor: fieldErrors.identifier ? '#BE123C' : '#E5DDCD',
                      borderRadius: 14,
                      height: 52,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      color: '#0C192B',
                    }}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#8E98A0"
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
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#BE123C',
                        marginTop: 4,
                        marginLeft: 4,
                      }}
                    >
                      {fieldErrors.identifier}
                    </Text>
                  )}
                </View>

                {/* Form Field: Password */}
                <View style={{ marginBottom: 8 }}>
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
                      placeholder="Enter your password"
                      placeholderTextColor="#8E98A0"
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
                  {fieldErrors.password && fieldErrors.password !== ' ' && (
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

                {/* Forgot password */}
                <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
                  <TouchableOpacity onPress={handleForgotPassword} style={{ paddingVertical: 4 }}>
                    <Text style={{ color: '#007AFF', fontWeight: '700', fontSize: 14 }}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Log in CTA */}
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
                  }}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontWeight: '700',
                          fontSize: 16,
                          marginLeft: 8,
                        }}
                      >
                        Logging in…
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                      Log in
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider: or */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginVertical: 20,
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5DDCD' }} />
                  <Text
                    style={{
                      marginHorizontal: 16,
                      fontSize: 14,
                      color: '#657080',
                      fontWeight: '500',
                    }}
                  >
                    or
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5DDCD' }} />
                </View>

                {/* Use biometrics */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#4F5330',
                    borderRadius: 9999,
                    height: 52,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                  onPress={handleBiometricAuth}
                  disabled={isSubmitting}
                >
                  <Fingerprint size={22} color="#4F5330" />
                  <Text
                    style={{
                      color: '#4F5330',
                      fontWeight: '700',
                      fontSize: 16,
                      marginLeft: 10,
                    }}
                  >
                    Use biometrics
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Register Link */}
              <View style={{ alignItems: 'center', paddingVertical: 14, marginTop: 24 }}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 14, color: '#0C192B', fontWeight: '500' }}>
                    New to Nilaaya?{' '}
                    <Text
                      style={{
                        fontWeight: '700',
                        textDecorationLine: 'underline',
                        color: '#0C192B',
                      }}
                    >
                      Register
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
