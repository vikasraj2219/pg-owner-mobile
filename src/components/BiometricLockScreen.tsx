import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';

export const BiometricLockScreen: React.FC = () => {
  const { user, organization, unlockWithBiometrics, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-between items-center p-8">
      <View className="items-center mt-12">
        <View className="w-20 h-20 bg-primary-600 rounded-3xl items-center justify-center mb-6 shadow-lg shadow-primary-500/50">
          <Fingerprint size={44} color="#ffffff" />
        </View>
        <Text className="text-2xl font-bold text-white text-center">PG Owner</Text>
        <Text className="text-sm text-slate-400 text-center mt-1">
          {organization?.name || 'Property Management'}
        </Text>
        {user && (
          <Text className="text-xs text-slate-500 text-center mt-2">Signed in as {user.name}</Text>
        )}
      </View>

      <View className="w-full max-w-xs items-center gap-4 mb-8">
        <TouchableOpacity
          className="w-full bg-primary-600 py-3.5 rounded-xl items-center flex-row justify-center gap-2 shadow-sm"
          onPress={() => void unlockWithBiometrics()}
        >
          <Fingerprint size={20} color="#ffffff" />
          <Text className="text-white font-semibold text-base">Unlock App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-1.5 py-2"
          onPress={() => void logout()}
        >
          <LogOut size={16} color="#94a3b8" />
          <Text className="text-xs text-slate-400 font-medium">Switch Account / Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
