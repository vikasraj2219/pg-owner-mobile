import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { formatINR } from '../../src/utils/currency';

export default function CheckoutScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <View className="bg-white rounded-xl p-4 border border-slate-200 mb-4 shadow-sm">
        <Text className="text-sm font-semibold text-slate-500">Checkout Settlement</Text>
        <Text className="text-xl font-extrabold text-slate-900 mb-4">Tenant ID: {tenantId}</Text>

        <View className="border-b border-slate-100 pb-3 mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-500">Deposit Paid (Credit)</Text>
            <Text className="text-xs font-bold text-emerald-700">+{formatINR(1500000)}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-500">Unpaid Invoices (Debit)</Text>
            <Text className="text-xs font-bold text-rose-600">-{formatINR(0)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-slate-500">Unbilled Utilities (Debit)</Text>
            <Text className="text-xs font-bold text-rose-600">-{formatINR(45000)}</Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
          Damage / Repair Deductions (₹)
        </Text>
        <TextInput
          className="border border-slate-200 rounded-lg p-2.5 mb-6 text-slate-800"
          placeholder="0"
          keyboardType="numeric"
          defaultValue="0"
        />

        <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex-row justify-between items-center mb-6">
          <Text className="text-sm font-bold text-emerald-900">Net Refundable Amount</Text>
          <Text className="text-lg font-extrabold text-emerald-700">{formatINR(1455000)}</Text>
        </View>

        <TouchableOpacity
          className="bg-rose-600 rounded-lg py-3.5 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold text-base">Confirm Vacate & Settle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
