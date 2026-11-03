import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Bell,
  AlertCircle,
  ChevronRight,
  Plus,
  CheckCircle2,
  UserPlus,
  Receipt,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useProperties } from '../../src/context/PropertyContext';
import { useDashboard } from '../../src/hooks/useDashboard';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';
import { TenantsDirectoryModal } from '../../src/components/TenantsDirectoryModal';
import { formatINR, formatINRCompact } from '../../src/utils/currency';
import { formatSafeMonthYear } from '../../src/utils/date';

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
    if (!subscription?.trialEndsAt) return 14;
    const diffTime = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const activePropertyName = selectedProperty?.name || organization?.name || 'My PG Property';
  const overdueCount = stats?.overdueCount ?? 0;
  const overdueAmountPaise = stats?.overdueAmountPaise ?? 0;

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
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <View className="flex-1 relative">
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#0A6C50"
              colors={['#0A6C50']}
            />
          }
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
              {overdueCount > 0 && (
                <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </TouchableOpacity>
          </View>

          {/* Month & Trial Pill Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-medium text-slate-600">{currentMonthYear}</Text>
            <View className="bg-[#FEF9C3] border border-[#FDE047] px-3 py-1 rounded-full flex-row items-center gap-1">
              <Sparkles size={12} color="#854D0E" />
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
                {formatINR(stats?.collectedThisMonthPaise ?? 0)}
              </Text>
              <Text className="text-base font-medium text-slate-500 ml-2">
                of {formatINR(stats?.expectedThisMonthPaise ?? 0)}
              </Text>
            </View>

            {/* Dark green progress bar */}
            <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
              <View
                className="h-full bg-[#0A6C50] rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, stats?.collectionRate ?? 0))}%`,
                }}
              />
            </View>

            <Text className="text-xs font-medium text-slate-500">
              {stats?.collectionRate ?? 0}% collected · {formatINR(stats?.pendingAmountPaise ?? 0)}{' '}
              pending
            </Text>
          </View>

          {/* Speed Actions: Pilot Quick-Access Bar */}
          <View className="flex-row gap-2.5 mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/matrix')}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs"
            >
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-1.5">
                <UserPlus size={20} color="#0A6C50" />
              </View>
              <Text className="text-xs font-extrabold text-slate-800 text-center">Check-in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/dues')}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs"
            >
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mb-1.5">
                <Receipt size={20} color="#D97706" />
              </View>
              <Text className="text-xs font-extrabold text-slate-800 text-center">Dues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowAddProperty(true)}
              className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs"
            >
              <View className="w-10 h-10 rounded-full bg-sky-50 items-center justify-center mb-1.5">
                <Building2 size={20} color="#0284C7" />
              </View>
              <Text className="text-xs font-extrabold text-slate-800 text-center">+ Property</Text>
            </TouchableOpacity>
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
                <Text className="text-2xl font-extrabold text-slate-900">
                  {stats?.occupiedBeds ?? 0} / {stats?.totalBeds ?? 0}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <Text className="text-xs font-bold text-[#0A6C50]">
                  {stats?.occupancyRate ?? 0}% full
                </Text>
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
                <Text className="text-2xl font-extrabold text-slate-900">
                  {formatINRCompact(stats?.netProfitPaise ?? 0)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <Text className="text-xs font-semibold text-slate-500">
                  {stats?.occupiedBeds ?? 0} active beds
                </Text>
                <ChevronRight size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Bed Inventory Breakdown */}
          <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bed Inventory
              </Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => router.push('/(tabs)/tenants' as any)}>
                  <Text className="text-xs font-bold text-slate-700">Tenants List</Text>
                </TouchableOpacity>
                <Text className="text-slate-300">·</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/matrix')}>
                  <Text className="text-xs font-bold text-[#0A6C50]">View Grid →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/matrix')}
                className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 items-center"
              >
                <Text className="text-xs font-bold text-emerald-800">🟢 Vacant</Text>
                <Text className="text-base font-black text-emerald-900 mt-0.5">
                  {stats?.availableBeds ?? 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/tenants' as any, params: { filter: 'active' } })
                }
                className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-2.5 items-center"
              >
                <Text className="text-xs font-bold text-rose-800">🔴 Occupied</Text>
                <Text className="text-base font-black text-rose-900 mt-0.5">
                  {stats?.occupiedBeds ?? 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/tenants' as any, params: { filter: 'notice' } })
                }
                className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-2.5 items-center"
              >
                <Text className="text-xs font-bold text-amber-800">🟡 Notice</Text>
                <Text className="text-base font-black text-amber-900 mt-0.5">
                  {stats?.noticeBeds ?? 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/matrix')}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 items-center"
              >
                <Text className="text-xs font-bold text-slate-700">⚪ Maint.</Text>
                <Text className="text-base font-black text-slate-800 mt-0.5">
                  {stats?.maintenanceBeds ?? 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overdue / Dues Status Banner */}
          {overdueCount > 0 ? (
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
                  <Text className="text-sm font-bold text-[#991B1B]">
                    {overdueCount} tenant{overdueCount === 1 ? '' : 's'} overdue &gt; 5d
                  </Text>
                  <Text className="text-xs text-rose-700 mt-0.5">
                    {formatINR(overdueAmountPaise)} pending collection
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#BE123C" />
            </TouchableOpacity>
          ) : (
            <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 mb-4 flex-row items-center justify-between shadow-xs">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
                  <CheckCircle2 size={22} color="#0A6C50" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#065F46]">
                    All rents collected on time
                  </Text>
                  <Text className="text-xs text-emerald-700 mt-0.5">
                    Zero overdue accounts pending
                  </Text>
                </View>
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
