import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, G } from 'react-native-svg';
import {
  ChevronDown,
  Bell,
  ChevronRight,
  Plus,
  LayoutGrid,
  Sparkles,
  Clock,
  Receipt,
  UserPlus,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useProperties } from '../../src/context/PropertyContext';
import { useDashboard } from '../../src/hooks/useDashboard';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';
import { TenantsDirectoryModal } from '../../src/components/TenantsDirectoryModal';
import { formatINR } from '../../src/utils/currency';
import { formatSafeMonthYear, calculateDaysRemaining } from '../../src/utils/date';

export default function PulseScreen() {
  const router = useRouter();
  const { organization, subscription } = useAuth();
  const { properties, selectedProperty, selectedPropertyId, setSelectedPropertyId } =
    useProperties();

  const { stats, isRefetching, refetch } = useDashboard(selectedPropertyId);

  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showTenantsModal, setShowTenantsModal] = useState(false);

  // Dynamic month & year display
  const currentMonthYear = useMemo(() => {
    return formatSafeMonthYear();
  }, []);

  // Dynamic trial remaining days
  const trialDaysLeft = useMemo(() => {
    if (!subscription?.trialEndsAt) return 13;
    return calculateDaysRemaining(subscription.trialEndsAt);
  }, [subscription]);

  const activePropertyName = selectedProperty?.name || organization?.name || 'Property-1';
  const overdueCount = stats?.overdueCount ?? 0;
  const overdueAmountPaise = stats?.overdueAmountPaise ?? 0;

  // Bed stats fallback
  const activePropertyStats = selectedProperty?.stats;
  const displayTotalBeds =
    stats?.totalBeds && stats.totalBeds > 0 ? stats.totalBeds : activePropertyStats?.totalBeds || 0;
  const displayOccupiedBeds =
    stats?.occupiedBeds !== undefined && (stats?.totalBeds || 0) > 0
      ? stats.occupiedBeds
      : activePropertyStats?.occupiedBeds || 0;
  const displayAvailableBeds =
    stats?.availableBeds !== undefined && (stats?.totalBeds || 0) > 0
      ? stats.availableBeds
      : activePropertyStats?.availableBeds || 0;
  const displayNoticeBeds = stats?.noticeBeds ?? 0;
  const displayMaintenanceBeds = stats?.maintenanceBeds ?? 0;
  const displayOccupancyRate =
    stats?.occupancyRate ||
    activePropertyStats?.occupancyRate ||
    (displayTotalBeds > 0 ? Math.round((displayOccupiedBeds / displayTotalBeds) * 1000) / 10 : 0);

  // Donut chart calculations
  const circumference = 2 * Math.PI * 36; // 226.195
  const safeTotal = displayTotalBeds > 0 ? displayTotalBeds : 1;

  const vacantStroke =
    displayTotalBeds > 0 ? (displayAvailableBeds / safeTotal) * circumference : 0;
  const occupiedStroke =
    displayTotalBeds > 0 ? (displayOccupiedBeds / safeTotal) * circumference : 0;
  const noticeStroke = displayTotalBeds > 0 ? (displayNoticeBeds / safeTotal) * circumference : 0;
  const maintStroke =
    displayTotalBeds > 0 ? (displayMaintenanceBeds / safeTotal) * circumference : 0;

  const occupiedOffset = 0;
  const noticeOffset = -occupiedStroke;
  const maintOffset = -(occupiedStroke + noticeStroke);
  const vacantOffset = -(occupiedStroke + noticeStroke + maintStroke);

  // Format relative timestamp
  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0F223D]" edges={['top']}>
      <View className="flex-1 bg-[#F4F6F9] relative">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
              colors={['#0F223D', '#0A6C50']}
            />
          }
        >
          {/* ======================================================== */}
          {/* TOP HERO CONTAINER: Deep Navy Background Header           */}
          {/* ======================================================== */}
          <View className="bg-[#0F223D] px-4 pt-2 pb-6 rounded-b-[32px] shadow-md">
            {/* Row 1: Property Selector Pill + Bell Notification Button */}
            <View className="flex-row items-center justify-between gap-3 mb-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowPropertyPicker(true)}
                className="flex-1 bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-xs"
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
                className="w-12 h-12 bg-[#1A2D4A] border border-[#273B5B] rounded-2xl items-center justify-center p-2.5 shadow-xs relative"
                onPress={() => router.push('/(tabs)/dues')}
              >
                <Bell size={20} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                {overdueCount > 0 && (
                  <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 border border-[#0F223D]" />
                )}
              </TouchableOpacity>
            </View>

            {/* Row 2: Month & Trial Pill */}
            <View className="flex-row items-center justify-between mb-3.5 px-0.5">
              <Text className="text-sm font-semibold text-slate-300">{currentMonthYear}</Text>
              <View className="bg-[#FEF3C7] px-3 py-1 rounded-full flex-row items-center gap-1.5">
                <Sparkles size={11} color="#B45309" fill="#B45309" />
                <Text className="text-xs font-extrabold text-[#B45309]">
                  {trialDaysLeft} days trial left
                </Text>
              </View>
            </View>

            {/* Row 3: Collected This Month Card */}
            <View className="bg-white rounded-[24px] p-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-sm font-semibold text-slate-700">Collected this month</Text>
                <Text className="text-sm font-extrabold text-[#0A6C50]">
                  {stats?.collectionRate ?? 0}%
                </Text>
              </View>

              <View className="flex-row items-baseline mb-3">
                <Text className="text-3xl font-black text-slate-900 tracking-tight">
                  {formatINR(stats?.collectedThisMonthPaise ?? 0, true)}
                </Text>
                <Text className="text-sm font-semibold text-slate-500 ml-1.5">
                  of {formatINR(stats?.expectedThisMonthPaise ?? 0, true)}
                </Text>
              </View>

              {/* Emerald Green Progress Bar */}
              <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <View
                  className="h-full bg-[#0A6C50] rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, stats?.collectionRate ?? 0))}%`,
                  }}
                />
              </View>

              <Text className="text-xs font-semibold text-slate-500">
                {stats?.collectionRate ?? 0}% collected ·{' '}
                {formatINR(stats?.pendingAmountPaise ?? 0)} pending
              </Text>
            </View>
          </View>

          {/* ======================================================== */}
          {/* BODY CONTENT: Light Background Section                    */}
          {/* ======================================================== */}
          <View className="px-4 pt-4">
            {/* Quick Actions Row: Check-in, Dues, + Property */}
            <View className="flex-row gap-3 mb-4">
              {/* Check-in */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/matrix')}
                className="flex-1 bg-[#E8F5EE] border border-[#C6F6D5] rounded-2xl py-3.5 items-center justify-center shadow-xs"
              >
                <View className="w-10 h-10 rounded-full bg-[#0A6C50] items-center justify-center mb-1.5 shadow-xs">
                  <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text className="text-xs font-extrabold text-slate-900">Check-in</Text>
              </TouchableOpacity>

              {/* Dues */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/dues')}
                className="flex-1 bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl py-3.5 items-center justify-center shadow-xs"
              >
                <View className="w-10 h-10 rounded-full bg-[#B45309] items-center justify-center mb-1.5 shadow-xs">
                  <Text className="text-white font-black text-base">₹</Text>
                </View>
                <Text className="text-xs font-extrabold text-slate-900">Dues</Text>
              </TouchableOpacity>

              {/* + Property */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowAddProperty(true)}
                className="flex-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl py-3.5 items-center justify-center shadow-xs"
              >
                <View className="w-10 h-10 rounded-full bg-[#1D4ED8] items-center justify-center mb-1.5 shadow-xs">
                  <LayoutGrid size={18} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text className="text-xs font-extrabold text-slate-900">+ Property</Text>
              </TouchableOpacity>
            </View>

            {/* Two-Column Stats: Occupancy & Net Profit */}
            <View className="flex-row gap-3.5 mb-4">
              {/* Occupancy Card */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/matrix')}
                className="flex-1 bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4 shadow-xs justify-between min-h-[125px]"
              >
                <View>
                  <Text className="text-[11px] font-black text-[#1D4ED8] uppercase tracking-wider mb-1">
                    OCCUPANCY
                  </Text>
                  <Text className="text-2xl font-black text-slate-900">
                    {displayOccupiedBeds} / {displayTotalBeds}
                  </Text>
                  {/* Mini blue progress bar */}
                  <View className="w-full h-1 bg-[#DBEAFE] rounded-full overflow-hidden my-2">
                    <View
                      className="h-full bg-[#1D4ED8] rounded-full"
                      style={{ width: `${Math.min(100, displayOccupancyRate)}%` }}
                    />
                  </View>
                </View>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs font-bold text-[#1D4ED8]">
                    {displayOccupancyRate}% full
                  </Text>
                  <View className="w-7 h-7 rounded-full bg-white shadow-xs items-center justify-center">
                    <ChevronRight size={14} color="#1D4ED8" strokeWidth={2.5} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Net Profit Card */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/more')}
                className="flex-1 bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 shadow-xs justify-between min-h-[125px]"
              >
                <View>
                  <Text className="text-[11px] font-black text-[#B45309] uppercase tracking-wider mb-1">
                    NET PROFIT
                  </Text>
                  <Text className="text-2xl font-black text-slate-900" numberOfLines={1}>
                    {formatINR(stats?.netProfitPaise ?? 0, true)}
                  </Text>
                  <Text className="text-xs font-semibold text-[#92400E] mt-1">
                    {displayOccupiedBeds} active beds
                  </Text>
                </View>
                <View className="flex-row items-center justify-end mt-2">
                  <View className="w-7 h-7 rounded-full bg-white shadow-xs items-center justify-center">
                    <ChevronRight size={14} color="#B45309" strokeWidth={2.5} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Bed Inventory Breakdown Card with Donut Chart */}
            <View className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-xs">
              <Text className="text-base font-black text-slate-900 mb-4">Bed inventory</Text>

              {/* Donut Chart & Legend Row */}
              <View className="flex-row items-center justify-between px-2">
                {/* Left: Donut SVG Chart */}
                <View className="relative w-[100px] h-[100px] items-center justify-center">
                  <Svg width={100} height={100} viewBox="0 0 100 100">
                    <G rotation="-90" origin="50, 50">
                      {/* Background Track */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="36"
                        stroke="#E2E8F0"
                        strokeWidth="13"
                        fill="none"
                      />
                      {/* Vacant Segment (Green) */}
                      {vacantStroke > 0 && (
                        <Circle
                          cx="50"
                          cy="50"
                          r="36"
                          stroke="#0A6C50"
                          strokeWidth="13"
                          strokeDasharray={`${vacantStroke} ${circumference}`}
                          strokeDashoffset={vacantOffset}
                          fill="none"
                        />
                      )}
                      {/* Notice Segment (Amber) */}
                      {noticeStroke > 0 && (
                        <Circle
                          cx="50"
                          cy="50"
                          r="36"
                          stroke="#F59E0B"
                          strokeWidth="13"
                          strokeDasharray={`${noticeStroke} ${circumference}`}
                          strokeDashoffset={noticeOffset}
                          fill="none"
                        />
                      )}
                      {/* Maintenance Segment (Slate) */}
                      {maintStroke > 0 && (
                        <Circle
                          cx="50"
                          cy="50"
                          r="36"
                          stroke="#94A3B8"
                          strokeWidth="13"
                          strokeDasharray={`${maintStroke} ${circumference}`}
                          strokeDashoffset={maintOffset}
                          fill="none"
                        />
                      )}
                      {/* Occupied Segment (Red) */}
                      {occupiedStroke > 0 && (
                        <Circle
                          cx="50"
                          cy="50"
                          r="36"
                          stroke="#E11D48"
                          strokeWidth="13"
                          strokeDasharray={`${occupiedStroke} ${circumference}`}
                          strokeDashoffset={occupiedOffset}
                          fill="none"
                        />
                      )}
                    </G>
                  </Svg>
                  {/* Center Number */}
                  <View className="absolute inset-0 items-center justify-center">
                    <Text className="text-2xl font-black text-slate-900">{displayTotalBeds}</Text>
                  </View>
                </View>

                {/* Right: Legend Breakdown */}
                <View className="flex-1 ml-6 gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#0A6C50]" />
                      <Text className="text-xs font-semibold text-slate-600">Vacant</Text>
                    </View>
                    <Text className="text-sm font-black text-slate-900">
                      {displayAvailableBeds}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                      <Text className="text-xs font-semibold text-slate-600">Occupied</Text>
                    </View>
                    <Text className="text-sm font-black text-slate-900">{displayOccupiedBeds}</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <Text className="text-xs font-semibold text-slate-600">Notice</Text>
                    </View>
                    <Text className="text-sm font-black text-slate-900">{displayNoticeBeds}</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                      <Text className="text-xs font-semibold text-slate-600">Maint.</Text>
                    </View>
                    <Text className="text-sm font-black text-slate-900">
                      {displayMaintenanceBeds}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Two Action Buttons */}
              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/tenants' as any)}
                  className="flex-1 bg-white border border-slate-300 py-3.5 rounded-xl items-center justify-center shadow-xs"
                >
                  <Text className="text-xs font-bold text-slate-800">Tenants list</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/matrix')}
                  className="flex-1 bg-[#0F223D] py-3.5 rounded-xl items-center justify-center shadow-xs"
                >
                  <Text className="text-xs font-bold text-white">View grid →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Overdue / Dues Status Banner with colored left accent */}
            {overdueCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/dues')}
                className="bg-white border-l-[5px] border-l-[#BE123C] border border-slate-200/80 rounded-2xl p-4 mb-4 flex-row items-center justify-between shadow-xs"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-[#BE123C]">
                    ⚠️ {overdueCount} tenant{overdueCount === 1 ? '' : 's'} overdue &gt; 5d
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {formatINR(overdueAmountPaise)} pending collection
                  </Text>
                </View>
                <ChevronRight size={18} color="#BE123C" />
              </TouchableOpacity>
            ) : (
              <View className="bg-white border-l-[5px] border-l-[#0A6C50] border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs">
                <Text className="text-sm font-bold text-slate-900">
                  ✓ All rents collected on time
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">Zero overdue accounts pending</Text>
              </View>
            )}

            {/* Recent Pulse Activity Feed */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
              <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Recent Pulse
                </Text>
                {stats.recentActivity.map(activity => (
                  <View
                    key={activity.id}
                    className="flex-row items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                          activity.type === 'payment' ? 'bg-emerald-50' : 'bg-blue-50'
                        }`}
                      >
                        {activity.type === 'payment' ? (
                          <Receipt size={17} color="#0A6C50" />
                        ) : (
                          <UserPlus size={17} color="#0284C7" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                          {activity.title}
                        </Text>
                        <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                          {activity.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      {activity.amountPaise !== undefined && (
                        <Text className="text-xs font-black text-slate-900">
                          {formatINR(activity.amountPaise)}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Clock size={10} color="#94A3B8" />
                        <Text className="text-[10px] text-slate-400">
                          {formatTime(activity.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Button (FAB) matching the design */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/matrix')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#0F223D] rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: '#0F223D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
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

      {/* Tenants Directory Modal */}
      <TenantsDirectoryModal
        visible={showTenantsModal}
        onClose={() => setShowTenantsModal(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onCheckoutTenant={id => router.push(`/checkout/${id}`)}
      />
    </SafeAreaView>
  );
}
