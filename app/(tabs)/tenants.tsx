import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Search,
  X,
  Plus,
  MoreVertical,
  User,
  Users,
  Edit2,
  MessageSquare,
  Clock,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Check,
  LogOut,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTenants } from '../../src/hooks/useTenants';
import { useProperties } from '../../src/context/PropertyContext';
import { ITenantListItem } from '../../src/types/api';
import {
  deleteTenantApi,
  restoreTenantApi,
  setTenantNoticeApi,
  cancelTenantNoticeApi,
} from '../../src/api/tenants';
import { formatINR } from '../../src/utils/currency';
import { formatDayMonth } from '../../src/utils/date';
import { openWhatsApp, sendRentReminder } from '../../src/utils/whatsapp';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';

type FilterTab = 'all' | 'active' | 'notice_period' | 'checked_out';

export default function TenantsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ filter?: string }>();
  const { selectedPropertyId, selectedProperty, properties, setSelectedPropertyId } =
    useProperties();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>(
    searchParams.filter === 'notice'
      ? 'notice_period'
      : searchParams.filter === 'active'
        ? 'active'
        : 'all',
  );
  const [isPropertySwitcherVisible, setIsPropertySwitcherVisible] = useState(false);
  const queryClient = useQueryClient();

  // Selected tenant for action sheet
  const [actionSheetTenant, setActionSheetTenant] = useState<ITenantListItem | null>(null);

  // "Can't delete yet" alert state
  const [cantDeleteModal, setCantDeleteModal] = useState<{
    visible: boolean;
    tenant: ITenantListItem | null;
    message: string;
  }>({
    visible: false,
    tenant: null,
    message: '',
  });

  // Delete confirmation modal state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    visible: boolean;
    tenant: ITenantListItem | null;
  }>({
    visible: false,
    tenant: null,
  });

  // Notice period modal state
  const [noticeModal, setNoticeModal] = useState<{
    visible: boolean;
    tenant: ITenantListItem | null;
    days: number;
    notes: string;
    isSubmitting: boolean;
  }>({
    visible: false,
    tenant: null,
    days: 30,
    notes: '',
    isSubmitting: false,
  });

  // Undo toast state
  const [undoToast, setUndoToast] = useState<{
    visible: boolean;
    tenantId: string;
    tenantName: string;
    secondsLeft: number;
  }>({
    visible: false,
    tenantId: '',
    tenantName: '',
    secondsLeft: 10,
  });

  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tenants
  const { tenants, isLoading, isRefetching, refetch } = useTenants({
    propertyId: selectedPropertyId || undefined,
  });

  // Tab counts
  const allCount = tenants.length;
  const activeCount = useMemo(() => tenants.filter(t => t.status === 'active').length, [tenants]);
  const noticeCount = useMemo(
    () => tenants.filter(t => t.status === 'notice_period').length,
    [tenants],
  );
  const checkedOutCount = useMemo(
    () => tenants.filter(t => t.status === 'checked_out').length,
    [tenants],
  );

  // Client-side search and status filter
  const filteredTenants = useMemo(() => {
    let list = tenants;

    if (activeTab !== 'all') {
      list = list.filter(t => t.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => {
        const nameMatch = t.fullName?.toLowerCase().includes(q);
        const phoneMatch = t.phone?.includes(q);
        const bedNum =
          typeof t.currentBed === 'object' ? t.currentBed?.bedNumber?.toLowerCase() : '';
        const roomNum =
          typeof t.currentBed === 'object' ? t.currentBed?.room?.roomNumber?.toLowerCase() : '';
        return nameMatch || phoneMatch || bedNum?.includes(q) || roomNum?.includes(q);
      });
    }

    return list;
  }, [tenants, activeTab, searchQuery]);

  // Handle undo countdown
  useEffect(() => {
    if (undoToast.visible && undoToast.secondsLeft > 0) {
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(prev => ({
          ...prev,
          secondsLeft: prev.secondsLeft - 1,
          visible: prev.secondsLeft - 1 > 0,
        }));
      }, 1000);
    }
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [undoToast.visible, undoToast.secondsLeft]);

  // Initials generator
  const getInitials = (name?: string) => {
    if (!name) return 'TN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Trigger Delete flow
  const handleDeletePress = (tenant: ITenantListItem) => {
    setActionSheetTenant(null);

    const isOccupied = tenant.status === 'active' || tenant.status === 'notice_period';
    const hasBed = Boolean(tenant.currentBed);
    const hasDues = (tenant.balanceDuePaise ?? 0) > 0;

    if (isOccupied || hasBed || hasDues) {
      // Show Can't delete yet dialog
      const bedNumber =
        typeof tenant.currentBed === 'object' ? tenant.currentBed?.bedNumber : 'assigned bed';
      const dueFormatted = formatINR(tenant.balanceDuePaise || 0);
      const depositFormatted = formatINR(tenant.depositPaise || 0);
      const msg = `${tenant.fullName} is still in Bed ${bedNumber} with ${dueFormatted} due and a ${depositFormatted} deposit held. Check him out first to settle dues, then you can delete his record.`;

      setCantDeleteModal({
        visible: true,
        tenant,
        message: msg,
      });
    } else {
      // Show confirmation dialog for settled/checked out tenant
      setConfirmDeleteModal({
        visible: true,
        tenant,
      });
    }
  };

  // Perform delete
  const executeDelete = async () => {
    const tenant = confirmDeleteModal.tenant;
    if (!tenant) return;

    setConfirmDeleteModal({ visible: false, tenant: null });

    try {
      const res = await deleteTenantApi(tenant._id);
      if (res.canDelete) {
        // Trigger undo toast
        setUndoToast({
          visible: true,
          tenantId: tenant._id,
          tenantName: tenant.fullName,
          secondsLeft: 10,
        });
        void refetch();
      } else {
        Alert.alert('Cannot Delete', res.message);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to delete tenant';
      Alert.alert('Delete Failed', errMsg);
    }
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!undoToast.tenantId) return;
    try {
      await restoreTenantApi(undoToast.tenantId);
      setUndoToast(prev => ({ ...prev, visible: false }));
      void refetch();
    } catch {
      Alert.alert('Error', 'Unable to restore tenant record.');
    }
  };

  // Notice Period submit
  const handleStartNoticeSubmit = async () => {
    const tenant = noticeModal.tenant;
    if (!tenant) return;

    setNoticeModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const vacateDate = new Date();
      vacateDate.setDate(vacateDate.getDate() + noticeModal.days);

      await setTenantNoticeApi(tenant._id, {
        expectedVacateDate: vacateDate.toISOString(),
        notes: noticeModal.notes || `Vacate notice period of ${noticeModal.days} days`,
      });

      setNoticeModal({
        visible: false,
        tenant: null,
        days: 30,
        notes: '',
        isSubmitting: false,
      });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void refetch();
      Alert.alert(
        'Notice Period Set',
        `${tenant.fullName} is now on ${noticeModal.days} days notice.`,
      );
      Alert.alert(
        'Notice Period Set',
        `${tenant.fullName} is now on ${noticeModal.days} days notice.`,
      );
    } catch (err: any) {
      setNoticeModal(prev => ({ ...prev, isSubmitting: false }));
      Alert.alert('Error', err?.response?.data?.message || 'Could not set notice period.');
    }
  };

  const handleCancelNotice = async (tenant: ITenantListItem) => {
    setActionSheetTenant(null);
    try {
      await cancelTenantNoticeApi(tenant._id);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void refetch();
      Alert.alert('Notice Canceled', `Notice period removed for ${tenant.fullName}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not cancel notice period.');
    }
  };

  // WhatsApp quick reminder
  const handleWhatsAppAction = (tenant: ITenantListItem) => {
    setActionSheetTenant(null);
    const bedStr =
      typeof tenant.currentBed === 'object' ? tenant.currentBed?.bedNumber : 'assigned bed';
    if ((tenant.balanceDuePaise ?? 0) > 0) {
      void sendRentReminder(
        tenant.phone,
        tenant.fullName,
        bedStr,
        tenant.balanceDuePaise!,
        (typeof tenant.property === 'object' && tenant.property?.upiVpa) || '',
      );
    } else {
      void openWhatsApp(tenant.phone, `Hello ${tenant.fullName}!`);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <Text className="text-3xl font-black text-slate-900 tracking-tight">Tenants</Text>
        <TouchableOpacity
          onPress={() => setIsPropertySwitcherVisible(true)}
          activeOpacity={0.7}
          className="flex-row items-center mt-1"
        >
          {searchQuery.trim().length > 0 ? (
            <Text className="text-sm font-semibold text-slate-500">
              {filteredTenants.length} result{filteredTenants.length === 1 ? '' : 's'} for &ldquo;
              {searchQuery}&rdquo;
            </Text>
          ) : (
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-slate-600">
                {selectedProperty?.name || 'All Properties'}
              </Text>
              <ChevronRight size={14} color="#64748B" style={{ marginLeft: 2 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 mt-3">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, phone or bed"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2.5 text-sm font-medium text-slate-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mt-3 -mx-5 px-5"
          contentContainerStyle={{ paddingRight: 30 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full border mr-2 flex-row items-center ${
              activeTab === 'all' ? 'bg-[#0B6645] border-[#0B6645]' : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'all' ? 'text-white' : 'text-slate-700'
              }`}
            >
              All · {allCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-full border mr-2 flex-row items-center ${
              activeTab === 'active' ? 'bg-[#0B6645] border-[#0B6645]' : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'active' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Active · {activeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('notice_period')}
            className={`px-4 py-2 rounded-full border mr-2 flex-row items-center ${
              activeTab === 'notice_period'
                ? 'bg-[#0B6645] border-[#0B6645]'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'notice_period' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Notice · {noticeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('checked_out')}
            className={`px-4 py-2 rounded-full border mr-2 flex-row items-center ${
              activeTab === 'checked_out'
                ? 'bg-[#0B6645] border-[#0B6645]'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'checked_out' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Checked out · {checkedOutCount}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0B6645" />
          <Text className="text-xs font-medium text-slate-400 mt-2">Loading tenants...</Text>
        </View>
      ) : filteredTenants.length === 0 ? (
        /* Empty State */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-[#E6F4EA] items-center justify-center mb-5">
            <Users size={36} color="#0B6645" />
          </View>
          <Text className="text-xl font-bold text-slate-900 text-center">
            {searchQuery ? 'No matching tenants' : 'No tenants yet'}
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-2 mb-6 px-4">
            {searchQuery
              ? 'Try adjusting your search keywords or clear filters.'
              : 'Add your first tenant to a vacant bed. It takes under 2 minutes.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/tenants/add' as any)}
            className="flex-row items-center bg-[#0B6645] px-6 py-3.5 rounded-full shadow-sm"
          >
            <Plus size={18} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-white font-bold text-sm ml-1.5">Add tenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#0B6645']}
              tintColor="#0B6645"
            />
          }
        >
          {filteredTenants.map(tenant => {
            const bedNumber =
              typeof tenant.currentBed === 'object' ? tenant.currentBed?.bedNumber : 'Bed';
            const dueAmount = tenant.balanceDuePaise ?? 0;
            const isCheckedOut = tenant.status === 'checked_out';
            const isNotice = tenant.status === 'notice_period';

            // Subtitle date string
            let subtitleText = '';
            if (isCheckedOut) {
              subtitleText = `Bed ${bedNumber} · Left ${formatDayMonth(tenant.updatedAt || tenant.createdAt)}`;
            } else if (isNotice) {
              subtitleText = `Bed ${bedNumber} · Leaves ${formatDayMonth(tenant.updatedAt || new Date())}`;
            } else {
              subtitleText = `Bed ${bedNumber} · Joined ${formatDayMonth(tenant.joinedDate || tenant.createdAt)}`;
            }

            return (
              <TouchableOpacity
                key={tenant._id}
                onPress={() => router.push(`/tenant/${tenant._id}` as any)}
                activeOpacity={0.7}
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm flex-row items-center justify-between"
              >
                {/* Left: Avatar */}
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-12 h-12 rounded-full bg-[#E0F2FE] items-center justify-center mr-3.5">
                    <Text className="text-sm font-black text-[#0369A1]">
                      {getInitials(tenant.fullName)}
                    </Text>
                  </View>

                  {/* Middle: Details */}
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900 leading-tight">
                      {tenant.fullName}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium mt-0.5">
                      {subtitleText}
                    </Text>

                    {/* Status Pill */}
                    <View className="flex-row items-center mt-1.5">
                      {tenant.status === 'active' && (
                        <View className="bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                          <Text className="text-[11px] font-bold text-[#0D652D]">Active</Text>
                        </View>
                      )}
                      {tenant.status === 'notice_period' && (
                        <View className="bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
                          <Text className="text-[11px] font-bold text-[#B45309]">Notice</Text>
                        </View>
                      )}
                      {tenant.status === 'checked_out' && (
                        <View className="bg-slate-100 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[11px] font-bold text-slate-600">Checked out</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right: Due / Paid / Settled + Kebab Menu */}
                <View className="flex-row items-center pl-2">
                  <View className="items-end mr-2">
                    {dueAmount > 0 ? (
                      <Text className="text-sm font-black text-[#991B1B]">
                        Due {formatINR(dueAmount)}
                      </Text>
                    ) : isCheckedOut ? (
                      <Text className="text-sm font-bold text-slate-500">Settled</Text>
                    ) : (
                      <Text className="text-sm font-black text-[#15803D]">Paid</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setActionSheetTenant(tenant)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="p-1 rounded-full active:bg-slate-100"
                  >
                    <MoreVertical size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Action Button (+ Add tenant) */}
      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => router.push('/tenants/add' as any)}
          activeOpacity={0.85}
          className="flex-row items-center bg-[#0B6645] px-5 py-3.5 rounded-full shadow-lg elevation-8"
        >
          <Plus size={20} color="#ffffff" strokeWidth={2.5} />
          <Text className="text-white font-bold text-sm ml-1.5">Add tenant</Text>
        </TouchableOpacity>
      </View>

      {/* Undo Floating Banner */}
      {undoToast.visible && (
        <View className="absolute bottom-6 left-5 right-5 bg-slate-900 rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-2xl elevation-10">
          <View className="flex-row items-center flex-1 mr-2">
            <Check size={18} color="#22C55E" strokeWidth={2.5} />
            <Text className="text-white text-sm font-bold ml-2 numberOfLines={1}">
              {undoToast.tenantName} deleted
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleUndoDelete}
            className="bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700"
          >
            <Text className="text-[#38BDF8] text-xs font-black">
              Undo · {undoToast.secondsLeft}s
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Bottom Sheet (Page 3) */}
      <Modal
        visible={actionSheetTenant !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetTenant(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActionSheetTenant(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-t-3xl pt-3 pb-8 px-6 border-t border-slate-100"
          >
            {/* Sheet Handle */}
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-4" />

            {/* Tenant Info Header */}
            {actionSheetTenant && (
              <View className="flex-row items-center pb-4 border-b border-slate-100 mb-2">
                <View className="w-12 h-12 rounded-full bg-[#E0F2FE] items-center justify-center mr-3.5">
                  <Text className="text-sm font-black text-[#0369A1]">
                    {getInitials(actionSheetTenant.fullName)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">
                    {actionSheetTenant.fullName}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5">
                    Bed{' '}
                    {typeof actionSheetTenant.currentBed === 'object'
                      ? actionSheetTenant.currentBed?.bedNumber
                      : 'N/A'}{' '}
                    ·{' '}
                    {(actionSheetTenant.balanceDuePaise ?? 0) > 0
                      ? `Due ${formatINR(actionSheetTenant.balanceDuePaise || 0)}`
                      : actionSheetTenant.status === 'checked_out'
                        ? 'Settled'
                        : 'Paid'}
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              onPress={() => {
                const id = actionSheetTenant?._id;
                setActionSheetTenant(null);
                if (id) router.push(`/tenant/${id}` as any);
              }}
              className="flex-row items-center py-3.5 border-b border-slate-50"
            >
              <User size={20} color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3.5">View profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const id = actionSheetTenant?._id;
                setActionSheetTenant(null);
                if (id) router.push(`/tenant/edit/${id}` as any);
              }}
              className="flex-row items-center py-3.5 border-b border-slate-50"
            >
              <Edit2 size={20} color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3.5">Edit tenant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => actionSheetTenant && handleWhatsAppAction(actionSheetTenant)}
              className="flex-row items-center py-3.5 border-b border-slate-50"
            >
              <MessageSquare size={20} color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3.5">
                Send WhatsApp reminder
              </Text>
            </TouchableOpacity>

            {actionSheetTenant?.status === 'notice_period' ? (
              <TouchableOpacity
                onPress={() => actionSheetTenant && handleCancelNotice(actionSheetTenant)}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <Clock size={20} color="#D97706" />
                <Text className="text-sm font-bold text-[#D97706] ml-3.5">
                  Cancel notice period
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const t = actionSheetTenant;
                  setActionSheetTenant(null);
                  if (t)
                    setNoticeModal({
                      visible: true,
                      tenant: t,
                      days: 30,
                      notes: '',
                      isSubmitting: false,
                    });
                }}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <Clock size={20} color="#334155" />
                <Text className="text-sm font-bold text-slate-800 ml-3.5">Start notice period</Text>
              </TouchableOpacity>
            )}

            {actionSheetTenant?.status !== 'checked_out' && (
              <TouchableOpacity
                onPress={() => {
                  const id = actionSheetTenant?._id;
                  setActionSheetTenant(null);
                  if (id) router.push(`/checkout/${id}`);
                }}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <LogOut size={20} color="#BE123C" />
                <Text className="text-sm font-bold text-[#BE123C] ml-3.5">Checkout tenant</Text>
              </TouchableOpacity>
            )}

            {actionSheetTenant?.status !== 'checked_out' && (
              <TouchableOpacity
                onPress={() => {
                  const id = actionSheetTenant?._id;
                  setActionSheetTenant(null);
                  if (id) router.push(`/checkout/${id}`);
                }}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <LogOut size={20} color="#BE123C" />
                <Text className="text-sm font-bold text-[#BE123C] ml-3.5">Checkout tenant</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => actionSheetTenant && handleDeletePress(actionSheetTenant)}
              className="flex-row items-center py-3.5"
            >
              <Trash2 size={20} color="#DC2626" />
              <Text className="text-sm font-bold text-[#DC2626] ml-3.5">Delete tenant</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* "Can't delete yet" Modal (Page 10) */}
      <Modal
        visible={cantDeleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCantDeleteModal(prev => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
              <AlertTriangle size={32} color="#D97706" />
            </View>
            <Text className="text-xl font-black text-slate-900 text-center mb-2">
              Can’t delete yet
            </Text>
            <Text className="text-sm text-slate-600 text-center leading-relaxed mb-6">
              {cantDeleteModal.message}
            </Text>

            <TouchableOpacity
              onPress={() => {
                const tenantId = cantDeleteModal.tenant?._id;
                setCantDeleteModal(prev => ({ ...prev, visible: false }));
                if (tenantId) router.push(`/checkout/${tenantId}`);
              }}
              className="w-full bg-[#0B6645] py-3.5 rounded-full items-center justify-center mb-3"
            >
              <Text className="text-white font-bold text-base">[→ Go to checkout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCantDeleteModal(prev => ({ ...prev, visible: false }))}
              className="py-2.5 items-center justify-center"
            >
              <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={confirmDeleteModal.visible}
        onClose={() => setConfirmDeleteModal({ visible: false, tenant: null })}
        onConfirm={executeDelete}
        title={`Delete ${confirmDeleteModal.tenant?.fullName || 'Tenant'}?`}
        message="His profile, ID photo, invoices and receipts will be removed. You will have 10 seconds to undo."
        confirmLabel="Delete"
      />

      {/* Start Notice Period Modal */}
      <Modal
        visible={noticeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <Text className="text-lg font-black text-slate-900 mb-1">Start Notice Period</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Set expected departure date for {noticeModal.tenant?.fullName}.
            </Text>

            <Text className="text-xs font-bold text-slate-700 mb-2">Notice Duration</Text>
            <View className="flex-row mb-4 space-x-2">
              {[15, 30, 45].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setNoticeModal(prev => ({ ...prev, days: d }))}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center mr-1 ${
                    noticeModal.days === d
                      ? 'bg-[#0B6645] border-[#0B6645]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      noticeModal.days === d ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-bold text-slate-700 mb-1">Notes (Optional)</Text>
            <TextInput
              value={noticeModal.notes}
              onChangeText={text => setNoticeModal(prev => ({ ...prev, notes: text }))}
              placeholder="e.g. Relocating for new job"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 mb-6"
            />

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
                className="flex-1 py-3 border border-slate-200 rounded-full items-center mr-2"
              >
                <Text className="text-xs font-bold text-slate-600">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartNoticeSubmit}
                disabled={noticeModal.isSubmitting}
                className="flex-1 py-3 bg-[#0B6645] rounded-full items-center ml-2"
              >
                {noticeModal.isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">Confirm Notice</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Property Switcher Modal */}
      <PropertySwitcherModal
        visible={isPropertySwitcherVisible}
        onClose={() => setIsPropertySwitcherVisible(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => setSelectedPropertyId(id)}
        onOpenAddProperty={() => {}}
      />
    </SafeAreaView>
  );
}
