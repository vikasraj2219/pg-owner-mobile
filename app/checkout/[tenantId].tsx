import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { formatINR } from '../../src/utils/currency';

export default function CheckoutScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const router = useRouter();
  const [deductions, setDeductions] = useState('0');

  const depositPaise = 1200000;
  const utilitiesDebitPaise = 45000;
  const deductionNumber = parseInt(deductions, 10) || 0;
  const netRefundPaise = Math.max(0, depositPaise - utilitiesDebitPaise - deductionNumber * 100);

  const handleConfirmVacate = () => {
    Alert.alert(
      'Confirm Vacate & Settlement',
      `Net refund of ${formatINR(netRefundPaise)} recorded. Bed ${tenantId} marked vacant.`,
      [
        {
          text: 'Complete',
          onPress: () => router.replace('/(tabs)/matrix'),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      {/* Top Header */}
      <View className="px-4 py-2 flex-row items-center border-b border-slate-200/60 bg-[#F8F9FA]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <View className="ml-1 flex-1">
          <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
            Checkout Settlement
          </Text>
          <Text className="text-xs font-medium text-slate-500 mt-0.5">
            Bed / Tenant: {tenantId}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-5 border border-slate-200/80 mb-4 shadow-xs">
          <Text className="text-sm font-semibold text-slate-500 mb-1">Settlement Summary</Text>
          <Text className="text-xl font-extrabold text-slate-900 mb-4">Bed {tenantId}</Text>

          <View className="border-b border-slate-100 pb-3 mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-slate-500">Security Deposit Paid</Text>
              <Text className="text-sm font-bold text-[#0A6C50]">+{formatINR(depositPaise)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-slate-500">Unpaid Invoices (Rent)</Text>
              <Text className="text-sm font-bold text-slate-700">-{formatINR(0)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Unbilled Utilities / Electricity</Text>
              <Text className="text-sm font-bold text-rose-600">
                -{formatINR(utilitiesDebitPaise)}
              </Text>
            </View>
          </View>

          <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
            Damage / Repair Deductions (₹)
          </Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3 mb-5 text-slate-900 bg-white shadow-xs text-base"
            placeholder="0"
            keyboardType="numeric"
            value={deductions}
            onChangeText={setDeductions}
          />

          <View className="bg-[#ECFDF5] border border-[#6EE7B7] p-4 rounded-xl flex-row justify-between items-center mb-6">
            <Text className="text-sm font-bold text-[#0A6C50]">Net Refundable Amount</Text>
            <Text className="text-xl font-extrabold text-[#0A6C50]">
              {formatINR(netRefundPaise)}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-[#0A6C50] rounded-xl py-4 items-center shadow-xs"
            onPress={handleConfirmVacate}
          >
            <Text className="text-white font-bold text-base">Confirm Vacate & Settle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
