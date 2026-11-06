import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  CircleCheck,
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

  // Progress bar calculations for bed inventory status cards
  const safeTotal = Math.max(1, displayTotalBeds);
  const vacantPct = Math.min(
    100,
    Math.max(
      displayAvailableBeds > 0 ? 5 : 0,
      Math.round((displayAvailableBeds / safeTotal) * 100),
    ),
  );
  const occupiedPct = Math.min(
    100,
    Math.max(displayOccupiedBeds > 0 ? 5 : 0, Math.round((displayOccupiedBeds / safeTotal) * 100)),
  );
  const noticePct = Math.min(
    100,
    Math.max(displayNoticeBeds > 0 ? 5 : 0, Math.round((displayNoticeBeds / safeTotal) * 100)),
  );
  const maintPct = Math.min(
    100,
    Math.max(
      displayMaintenanceBeds > 0 ? 5 : 0,
      Math.round((displayMaintenanceBeds / safeTotal) * 100),
    ),
  );

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

            {/* Bed Inventory Breakdown Card with 4 Status Cards */}
            <View className="bg-white border border-slate-100 rounded-3xl p-4.5 mb-4 shadow-xs">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-black text-slate-900">Bed inventory</Text>
                {/* Segmented Pill Navigation */}
                <View className="flex-row items-center bg-[#F1F5F9] p-1 rounded-full">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/tenants' as any)}
                    className="bg-[#0A6C50] px-3.5 py-1.5 rounded-full shadow-xs"
                  >
                    <Text className="text-xs font-bold text-white">Tenants list</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/matrix')}
                    className="px-3.5 py-1.5 rounded-full"
                  >
                    <Text className="text-xs font-bold text-slate-600">Grid view</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4 Status Cards Row */}
              <View className="flex-row items-center justify-between gap-2">
                {/* Vacant Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/matrix')}
                  className="flex-1 bg-[#EAF7EE] border border-[#BBF7D0] rounded-2xl p-2.5"
                >
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <Text className="text-[11px] font-black text-[#065F46]" numberOfLines={1}>
                      Vacant
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-[#064E3B] my-0.5">
                    {displayAvailableBeds}
                  </Text>
                  <View className="h-1.5 w-full bg-[#D1FAE5] rounded-full overflow-hidden mt-1">
                    <View
                      className="h-full bg-[#10B981] rounded-full"
                      style={{ width: `${vacantPct}%` }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Occupied Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/tenants' as any)}
                  className="flex-1 bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-2.5"
                >
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-1 h-2.5 rounded-full bg-[#E11D48]" />
                    <Text className="text-[11px] font-black text-[#9F1239]" numberOfLines={1}>
                      Occupied
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-[#881337] my-0.5">
                    {displayOccupiedBeds}
                  </Text>
                  <View className="h-1.5 w-full bg-[#FFE4E6] rounded-full overflow-hidden mt-1">
                    <View
                      className="h-full bg-[#E11D48] rounded-full"
                      style={{ width: `${occupiedPct}%` }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Notice Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/tenants' as any)}
                  className="flex-1 bg-[#FEF9ED] border border-[#FDE68A] rounded-2xl p-2.5"
                >
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2 h-2 rounded-full bg-[#D97706]" />
                    <Text className="text-[11px] font-black text-[#92400E]" numberOfLines={1}>
                      Notice
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-[#78350F] my-0.5">
                    {displayNoticeBeds}
                  </Text>
                  <View className="h-1.5 w-full bg-[#FEF3C7] rounded-full overflow-hidden mt-1">
                    <View
                      className="h-full bg-[#D97706] rounded-full"
                      style={{ width: `${noticePct}%` }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Maintenance Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/matrix')}
                  className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl p-2.5"
                >
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <View className="w-2 h-2 rounded-full bg-[#64748B]" />
                    <Text className="text-[11px] font-black text-[#334155]" numberOfLines={1}>
                      Maint.
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-[#1E293B] my-0.5">
                    {displayMaintenanceBeds}
                  </Text>
                  <View className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden mt-1">
                    <View
                      className="h-full bg-[#64748B] rounded-full"
                      style={{ width: `${maintPct}%` }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Overdue / Dues Status Banner */}
            {overdueCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/dues')}
                className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-3.5 mb-4 flex-row items-center justify-between shadow-xs"
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-11 h-11 rounded-full bg-[#BE123C] items-center justify-center mr-3.5">
                    <CircleCheck size={22} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-[#9F1239]">
                      {overdueCount} tenant{overdueCount === 1 ? '' : 's'} overdue &gt; 5d
                    </Text>
                    <Text className="text-xs font-semibold text-[#BE123C] mt-0.5">
                      {formatINR(overdueAmountPaise)} pending collection
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#BE123C" />
              </TouchableOpacity>
            ) : (
              <View className="bg-[#EAF7EE] border border-[#A7F3D0] rounded-2xl p-3.5 mb-4 flex-row items-center shadow-xs">
                <View className="w-11 h-11 rounded-full bg-[#0A6C50] items-center justify-center mr-3.5">
                  <CircleCheck size={24} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-[#064E3B]">
                    All rents collected on time
                  </Text>
                  <Text className="text-xs font-semibold text-[#065F46] mt-0.5">
                    Zero overdue accounts pending
                  </Text>
                </View>
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

        {/* Floating Action Button (+ Add) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/tenants/add' as any)}
          className="absolute bottom-6 right-6 flex-row items-center bg-[#0A6C50] px-5 py-3.5 rounded-full shadow-lg"
          style={{
            shadowColor: '#0A6C50',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={3} />
          <Text className="text-base font-bold text-white ml-1.5">Add</Text>
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
