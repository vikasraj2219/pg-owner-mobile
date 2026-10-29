import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Fingerprint, AlertCircle } from 'lucide-react-native';
import { AppLogo } from './AppLogo';
import { useAuth } from '../hooks/useAuth';

export const BiometricLockScreen: React.FC = () => {
  const { organization, unlockWithBiometrics, logout } = useAuth();
  const [hasFailed, setHasFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);
  const maxAttempts = 3;

  const triggerAuth = async () => {
    const success = await unlockWithBiometrics();
    if (!success) {
      setHasFailed(true);
      setAttemptCount(prev => Math.min(prev + 1, maxAttempts));
    } else {
      setHasFailed(false);
    }
  };

  useEffect(() => {
    // Attempt biometric unlock on initial display
    void triggerAuth();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA] justify-between items-center px-6 py-10">
      {/* Top Header */}
      <View className="items-center mt-8">
        <View className="mb-5">
          <AppLogo size={52} />
        </View>
        <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Unlock PG Manager
        </Text>
        <Text className="text-sm text-slate-500 font-medium mt-1">
          {organization?.name || 'Sri Sai Boys PG, Madhapur'}
        </Text>
      </View>

      {/* Center Biometric Ring */}
      <View className="items-center w-full max-w-sm">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={triggerAuth}
          className={`w-52 h-52 rounded-full items-center justify-center mb-8 border-2 ${
            hasFailed ? 'border-rose-300 bg-rose-50/60' : 'border-emerald-300 bg-[#E8F5EE]/40'
          }`}
          style={{
            shadowColor: hasFailed ? '#F43F5E' : '#0A6C50',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          {/* Inner ring */}
          <View
            className={`w-40 h-40 rounded-full items-center justify-center border ${
              hasFailed ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            <Fingerprint size={72} color={hasFailed ? '#BE123C' : '#0A6C50'} strokeWidth={1.75} />
          </View>
        </TouchableOpacity>

        {/* Status Prompt / Error Message */}
        {hasFailed ? (
          <View className="w-full items-center">
            <View className="flex-row items-center justify-center px-3 mb-6">
              <AlertCircle size={17} color="#BE123C" />
              <Text className="text-sm font-semibold text-rose-800 ml-1.5 text-center">
                Fingerprint not recognised. Try again ({attemptCount} of {maxAttempts})
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={triggerAuth}
              className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center shadow-sm"
            >
              <Text className="text-white font-bold text-base">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-base font-bold text-slate-800 mt-2">
            Touch the sensor to unlock
          </Text>
        )}
      </View>

      {/* Bottom Option */}
      <View className="items-center mb-4">
        <TouchableOpacity onPress={() => void logout()} className="py-2.5 px-4">
          <Text className="text-blue-600 font-bold text-sm underline">Use password instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
