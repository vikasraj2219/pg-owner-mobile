import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { AppLogo } from './AppLogo';

interface SplashScreenViewProps {
  onDismiss?: () => void;
}

export const SplashScreenView: React.FC<SplashScreenViewProps> = ({ onDismiss }) => {
  return (
    <SafeAreaView className="flex-1 bg-[#0A6C50] justify-between items-center py-12 px-6">
      {/* Top spacer */}
      <View className="h-4" />

      {/* Center Branding */}
      <TouchableOpacity activeOpacity={0.9} onPress={onDismiss} className="items-center">
        <View className="mb-6">
          <AppLogo size={88} variant="white" />
        </View>

        <Text className="text-4xl font-extrabold text-white tracking-tight mb-2 text-center">
          PG Manager
        </Text>

        <Text className="text-lg font-medium text-emerald-100 text-center">
          Run your PG from your pocket
        </Text>
      </TouchableOpacity>

      {/* Bottom status dots and feature tags */}
      <View className="items-center w-full">
        {/* 5 rounded capsules representing bed status colors */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-10 h-6 rounded-lg bg-[#D1FAE5]" />
          <View className="w-10 h-6 rounded-lg bg-[#ECFDF5]" />
          <View className="w-10 h-6 rounded-lg bg-[#FEF3C7]" />
          <View className="w-10 h-6 rounded-lg bg-[#FEF9C3]" />
          <View className="w-10 h-6 rounded-lg bg-[#E2E8F0]" />
        </View>

        <Text className="text-sm font-semibold text-emerald-100 tracking-wide">
          Beds · Rent · KYC · Meters
        </Text>
      </View>
    </SafeAreaView>
  );
};
