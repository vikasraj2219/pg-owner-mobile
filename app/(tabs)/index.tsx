import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatCard } from '../../src/components/StatCard';
import { formatINR } from '../../src/utils/currency';
import { UserPlus, ArrowUpRight, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';

export default function PulseScreen() {
  const router = useRouter();
  const { organization, subscription } = useAuth();

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Property & Trial Status Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-xs text-slate-500 font-medium">Organization / PG</Text>
          <Text className="text-lg font-bold text-slate-900">
            {organization?.name || 'My PG Organization'}
          </Text>
        </View>
        <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-emerald-700 capitalize">
            {subscription?.status === 'trialing'
              ? '14-Day Free Trial'
              : subscription?.plan || 'Starter'}
          </Text>
        </View>
      </View>

      {/* Overdue Alert Banner */}
      <View className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex-row items-center mb-4">
        <AlertTriangle color="#d97706" size={20} />
        <View className="ml-3 flex-1">
          <Text className="text-xs font-bold text-amber-800">4 Overdue Rent Invoices</Text>
          <Text className="text-xs text-amber-700">
            {formatINR(3400000)} pending collection. 1-tap reminders available in Dues tab.
          </Text>
        </View>
      </View>

      {/* Financial Pulse Cards */}
      <View className="flex-row gap-3 mb-3">
        <StatCard
          title="Collected / Expected"
          value={formatINR(12000000)}
          subtitle={`Expected: ${formatINR(18500000)}`}
        />
        <StatCard title="Occupancy" value="88%" subtitle="22 of 25 beds" />
      </View>

      <View className="flex-row gap-3 mb-6">
        <StatCard
          title="Expenses (MTD)"
          value={formatINR(2450000)}
          subtitle="Groceries, EB, Wi-Fi"
        />
        <StatCard title="Net Cashflow" value={formatINR(9550000)} subtitle="MTD Operating Profit" />
      </View>

      {/* Quick Action Floating / Grid Buttons */}
      <Text className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">
        Quick Workflows
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <TouchableOpacity
          className="bg-primary-600 rounded-xl p-4 flex-1 min-w-[140px] flex-row items-center justify-between"
          onPress={() => router.push('/checkin/101-A')}
        >
          <View>
            <Text className="text-white font-bold text-base">Check-in</Text>
            <Text className="text-blue-100 text-xs">Photo KYC in 2m</Text>
          </View>
          <UserPlus color="#ffffff" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white border border-slate-200 rounded-xl p-4 flex-1 min-w-[140px] flex-row items-center justify-between"
          onPress={() => router.push('/(tabs)/dues')}
        >
          <View>
            <Text className="text-slate-900 font-bold text-base">Mark Paid</Text>
            <Text className="text-slate-500 text-xs">Instant Receipt</Text>
          </View>
          <ArrowUpRight color="#2563eb" size={22} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
