import React from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AppLogo } from './AppLogo';

interface SplashScreenViewProps {
  showLoader?: boolean;
  onDismiss?: () => void;
}

export const SplashScreenView: React.FC<SplashScreenViewProps> = ({
  showLoader = true,
  onDismiss,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-[#0A6C50] justify-between items-center py-12 px-6">
      {/* Top spacer */}
      <View className="h-4" />

      {/* Center Branding */}
      <View className="items-center">
        <TouchableOpacity
          activeOpacity={onDismiss ? 0.8 : 1}
          onPress={onDismiss}
          className="items-center"
        >
          <View className="mb-6 shadow-xl elevation-8">
            <AppLogo size={110} variant="white" />
          </View>

          <Text className="text-4xl font-black text-white tracking-tight mb-2 text-center">
            Nilaaya
          </Text>

          <Text className="text-base font-semibold text-emerald-100/90 text-center">
            Run your PG from your pocket
          </Text>
        </TouchableOpacity>

        {showLoader && (
          <View className="mt-8">
            <ActivityIndicator size="small" color="#A7F3D0" />
          </View>
        )}
      </View>

      {/* Bottom status dots and feature tags */}
      <View className="items-center w-full">
        {/* 5 rounded capsules representing bed status colors */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="w-10 h-3 rounded-full bg-[#34D399]" />
          <View className="w-10 h-3 rounded-full bg-[#F87171]" />
          <View className="w-10 h-3 rounded-full bg-[#FBBF24]" />
          <View className="w-10 h-3 rounded-full bg-[#60A5FA]" />
          <View className="w-10 h-3 rounded-full bg-[#94A3B8]" />
        </View>

        <Text className="text-xs font-bold text-emerald-100/80 tracking-widest uppercase">
          Beds · Rent · KYC · Meters
        </Text>
      </View>
    </SafeAreaView>
  );
};
