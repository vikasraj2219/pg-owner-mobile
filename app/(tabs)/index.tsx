import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Bell, AlertCircle, ChevronRight, Plus } from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useProperties } from '../../src/context/PropertyContext';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';

export default function PulseScreen() {
  const router = useRouter();
  const { organization, subscription } = useAuth();
  const { properties, selectedProperty, selectedPropertyId, setSelectedPropertyId } =
    useProperties();

  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  // Dynamic month & year display
  const currentMonthYear = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, []);

  // Dynamic trial remaining days
  const trialDaysLeft = useMemo(() => {
    if (!subscription?.trialEndsAt) return 14;
    const diffTime = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const activePropertyName = selectedProperty?.name || organization?.name || 'My PG Property';

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
                {activePropertyName}
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
            <Text className="text-base font-medium text-slate-600">{currentMonthYear}</Text>
            <View className="bg-[#FEF9C3] border border-[#FDE047] px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#854D0E]">
                {trialDaysLeft} days trial left
              </Text>
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
                <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Occupancy
                </Text>
                <Text className="text-2xl font-extrabold text-slate-900">42 / 48</Text>
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <Text className="text-xs font-bold text-[#0A6C50]">87.5% full</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {/* Net Operating Profit Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/more')}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs justify-between min-h-[120px]"
            >
              <View>
                <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Net profit
                </Text>
                <Text className="text-2xl font-extrabold text-slate-900">₹2.18L</Text>
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <Text className="text-xs font-semibold text-slate-500">After ₹1.24L exp</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Overdue Alert Banner */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/dues')}
            className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 mb-4 flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-full bg-rose-100 items-center justify-center mr-3">
                <AlertCircle size={22} color="#BE123C" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#991B1B]">3 tenants overdue &gt; 5d</Text>
                <Text className="text-xs text-rose-700 mt-0.5">₹28,000 pending collection</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#BE123C" />
          </TouchableOpacity>
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/matrix')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#0A6C50] rounded-full items-center justify-center shadow-lg"
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
      <PropertySwitcherModal
        visible={showPropertyPicker}
        onClose={() => setShowPropertyPicker(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => {
          void setSelectedPropertyId(id);
          setShowPropertyPicker(false);
        }}
        onOpenAddProperty={() => {
          setShowPropertyPicker(false);
          setShowAddProperty(true);
        }}
      />

      {/* Add Property Modal */}
      <AddPropertyModal
        visible={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onSuccess={id => {
          void setSelectedPropertyId(id);
          setShowAddProperty(false);
        }}
      />
    </SafeAreaView>
  );
}
