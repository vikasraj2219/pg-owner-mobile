import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ShieldCheck } from 'lucide-react-native';

export default function CheckinScreen() {
  const { bedId } = useLocalSearchParams<{ bedId: string }>();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <View className="bg-white rounded-xl p-4 border border-slate-200 mb-4 shadow-sm">
        <Text className="text-sm font-semibold text-slate-500">Allocated Bed</Text>
        <Text className="text-xl font-extrabold text-primary-600 mb-4">{bedId}</Text>

        <Text className="text-xs font-bold text-slate-700 uppercase mb-1">Tenant Full Name</Text>
        <TextInput
          className="border border-slate-200 rounded-lg p-2.5 mb-4 text-slate-800"
          placeholder="e.g. Rahul Sharma"
        />

        <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
          Phone Number (WhatsApp)
        </Text>
        <TextInput
          className="border border-slate-200 rounded-lg p-2.5 mb-4 text-slate-800"
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
        />

        <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
          Emergency Contact Phone
        </Text>
        <TextInput
          className="border border-slate-200 rounded-lg p-2.5 mb-4 text-slate-800"
          placeholder="Parent / Guardian phone"
          keyboardType="phone-pad"
        />

        {/* Camera KYC Upload Wireframe */}
        <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
          Photo KYC (Aadhaar / PAN)
        </Text>
        <TouchableOpacity className="border-2 border-dashed border-slate-300 rounded-xl p-6 items-center justify-center bg-slate-50 mb-4">
          <Camera size={32} color="#64748b" />
          <Text className="text-sm font-semibold text-slate-600 mt-2">
            Tap to Snap KYC Document
          </Text>
          <Text className="text-xs text-slate-400">Auto-compressed under 200 KB</Text>
        </TouchableOpacity>

        {/* DPDP Consent Checkbox Wireframe */}
        <View className="flex-row items-center gap-2 p-3 bg-blue-50 rounded-lg mb-6 border border-blue-100">
          <ShieldCheck size={20} color="#2563eb" />
          <Text className="text-xs text-blue-900 flex-1 leading-tight">
            Tenant has voluntarily consented to KYC data storage in compliance with DPDP Act 2023.
          </Text>
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-lg py-3.5 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold text-base">Complete Check-in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
