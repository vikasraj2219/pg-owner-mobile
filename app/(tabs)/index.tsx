import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Bell,
  AlertCircle,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';

export default function PulseScreen() {
  const router = useRouter();
  const { organization } = useAuth();
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(
    organization?.name || 'Sri Sai Boys PG, Madhapur',
  );

  const properties = [
    'Sri Sai Boys PG, Madhapur',
    'Sri Sai Luxury PG, Gachibowli',
    'Sri Sai Executive, Hitec City',
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <View className="flex-1 relative">
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top PG Selector and Notification Bell */}
          <View className="flex-row items-center justify-between gap-3 mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPropertyPicker(true)}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 flex-row items-center justify-between shadow-xs"
            >
              <Text
                className="text-base font-extrabold text-slate-900 flex-1 mr-2"
                numberOfLines={1}
              >
                {selectedProperty}
              </Text>
              <ChevronDown size={18} color="#1E293B" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className="w-13 h-13 bg-white border border-slate-200/80 rounded-2xl items-center justify-center p-3 shadow-xs relative"
              onPress={() => router.push('/(tabs)/dues')}
            >
              <Bell size={20} color="#1E293B" strokeWidth={2} />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
            </TouchableOpacity>
          </View>

          {/* Month & Trial Pill Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-medium text-slate-600">October 2026</Text>
            <View className="bg-[#FEF9C3] border border-[#FDE047] px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#854D0E]">11 days trial left</Text>
            </View>
          </View>

          {/* Main Card: Collected This Month */}
          <View className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-4 shadow-xs">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Collected this month</Text>
            <View className="flex-row items-baseline mb-3">
              <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ₹3,42,000
              </Text>
              <Text className="text-base font-medium text-slate-500 ml-2">of ₹4,10,000</Text>
            </View>

            {/* Dark green progress bar */}
            <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
              <View className="h-full bg-[#0A6C50] rounded-full" style={{ width: '83%' }} />
            </View>

            <Text className="text-xs font-medium text-slate-500">
              83% collected · ₹68,000 pending
            </Text>
          </View>

          {/* Two-Column Stats: Occupancy & Net Profit */}
          <View className="flex-row gap-3.5 mb-4">
            {/* Occupancy Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/matrix')}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs justify-between min-h-[120px]"
            >
              <View>
                <Text className="text-xs font-semibold text-slate-600 mb-1.5">Occupancy</Text>
                <Text className="text-2xl font-extrabold text-slate-900 mb-2">42 / 48</Text>
                {/* Blue progress bar */}
                <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <View className="h-full bg-blue-600 rounded-full" style={{ width: '87.5%' }} />
                </View>
              </View>
              <Text className="text-xs font-medium text-slate-500">87.5% beds full</Text>
            </TouchableOpacity>

            {/* Net Profit Card */}
            <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs justify-between min-h-[120px]">
              <View>
                <Text className="text-xs font-semibold text-slate-600 mb-1.5">Net profit</Text>
                <Text className="text-2xl font-extrabold text-[#0A6C50] mb-2">₹2,18,000</Text>
              </View>
              <Text className="text-xs font-medium text-slate-500">After expenses</Text>
            </View>
          </View>

          {/* Alert Banners */}
          {/* Overdue Rents Banner */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/dues')}
            className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 flex-row items-center justify-between mb-3 shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <AlertCircle size={18} color="#991B1B" />
              <Text className="text-sm font-bold text-[#991B1B] ml-2.5">
                6 overdue rents · ₹48,000
              </Text>
            </View>
            <ChevronRight size={18} color="#991B1B" />
          </TouchableOpacity>

          {/* Vacating Banner */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/matrix')}
            className="bg-[#FEFCE8] border border-[#FEF08A] rounded-2xl p-4 flex-row items-center justify-between mb-3 shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <AlertCircle size={18} color="#854D0E" />
              <Text className="text-sm font-bold text-[#854D0E] ml-2.5">
                1 tenant vacating this week
              </Text>
            </View>
            <ChevronRight size={18} color="#854D0E" />
          </TouchableOpacity>
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/checkin/201-A')}
          className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-[#0A6C50] items-center justify-center shadow-lg"
          style={{
            shadowColor: '#0A6C50',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Property Switcher Modal */}
      <Modal
        visible={showPropertyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPropertyPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPropertyPicker(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-slate-900">Select PG Branch</Text>
              <TouchableOpacity onPress={() => setShowPropertyPicker(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {properties.map(item => (
              <TouchableOpacity
                key={item}
                className="py-3.5 px-3 rounded-xl border border-slate-100 flex-row items-center justify-between mb-2"
                onPress={() => {
                  setSelectedProperty(item);
                  setShowPropertyPicker(false);
                }}
              >
                <Text
                  className={`text-base font-semibold ${
                    selectedProperty === item ? 'text-[#0A6C50]' : 'text-slate-800'
                  }`}
                >
                  {item}
                </Text>
                {selectedProperty === item && <CheckCircle2 size={20} color="#0A6C50" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
