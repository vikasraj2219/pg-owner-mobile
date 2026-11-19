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
import { StatusBar } from 'expo-status-bar';
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
  Building,
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
import { openWhatsApp } from '../../src/utils/whatsapp';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { ConfirmDeleteModal, ConfirmActionModal } from '../../src/components/ConfirmDeleteModal';
import { SuccessActionModal } from '../../src/components/SuccessActionModal';
import { DecorativeWaveFooter } from '../../src/components/DecorativeWaveFooter';

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

  const [confirmCancelNoticeTenant, setConfirmCancelNoticeTenant] =
    useState<ITenantListItem | null>(null);

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    highlightCard?: {
      icon?: React.ReactNode;
      title: string;
      subtitle?: string;
    };
  }>({
    visible: false,
    title: '',
    message: '',
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
    propertyId:
      selectedPropertyId === 'all' || !selectedPropertyId ? undefined : selectedPropertyId,
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

      const daysCount = noticeModal.days;
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

      setSuccessModal({
        visible: true,
        title: 'Notice Period Set!',
        message: `${tenant.fullName} is now on a ${daysCount}-day notice period. Expected departure date is ${formatDayMonth(vacateDate)}.`,
        highlightCard: {
          icon: <Clock size={16} color="#B45309" />,
          title: `${daysCount} Days Notice`,
          subtitle: `${tenant.fullName} · Vacate: ${formatDayMonth(vacateDate)}`,
        },
      });
    } catch (err: any) {
      setNoticeModal(prev => ({ ...prev, isSubmitting: false }));
      Alert.alert('Error', err?.response?.data?.message || 'Could not set notice period.');
    }
  };

  const handleCancelNotice = (tenant: ITenantListItem) => {
    setActionSheetTenant(null);
    setConfirmCancelNoticeTenant(tenant);
  };

  const handleExecuteCancelNotice = async () => {
    if (!confirmCancelNoticeTenant) return;
    const targetTenant = confirmCancelNoticeTenant;
    try {
      await cancelTenantNoticeApi(targetTenant._id);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void refetch();
      setConfirmCancelNoticeTenant(null);
      setSuccessModal({
        visible: true,
        title: 'Notice Period Cancelled',
        message: `Notice period has been cancelled for ${targetTenant.fullName}. Status restored to active.`,
        highlightCard: {
          icon: <Clock size={16} color="#15803D" />,
          title: targetTenant.fullName,
          subtitle: 'Active Occupancy Restored',
        },
      });
    } catch (err: any) {
      setConfirmCancelNoticeTenant(null);
      Alert.alert('Error', err?.response?.data?.message || 'Could not cancel notice period.');
    }
  };

  // WhatsApp quick reminder
  const handleWhatsAppAction = (tenant: ITenantListItem) => {
    setActionSheetTenant(null);
    const bedStr =
      typeof tenant.currentBed === 'object' ? tenant.currentBed?.bedNumber : 'assigned bed';
    if ((tenant.balanceDuePaise ?? 0) > 0) {
      router.push({
        pathname: `/reminder/${tenant._id}`,
        params: {
          tenantName: tenant.fullName,
          phone: tenant.phone,
          bedNo: `Bed ${bedStr}`,
          amountPaise: tenant.balanceDuePaise!.toString(),
          overdueDays: (tenant.overdueDays || 0).toString(),
          upiVpa: (typeof tenant.property === 'object' && tenant.property?.upiVpa) || '',
        },
      } as any);
    } else {
      void openWhatsApp(tenant.phone, `Hello ${tenant.fullName}!`);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      <StatusBar style="dark" />
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: '#FFFDF8',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#0C192B', letterSpacing: -0.5 }}>
          Tenants
        </Text>
        <TouchableOpacity
          onPress={() => setIsPropertySwitcherVisible(true)}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
        >
          {searchQuery.trim().length > 0 ? (
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
              {filteredTenants.length} result{filteredTenants.length === 1 ? '' : 's'} for &ldquo;
              {searchQuery}&rdquo;
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                {selectedProperty?.name || 'All Properties'}
              </Text>
              <ChevronRight size={14} color="#4F5330" style={{ marginLeft: 3 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FAF7F2',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 12,
          }}
        >
          <Search size={18} color="#657080" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, phone or bed"
            placeholderTextColor="#8E98A0"
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              fontWeight: '500',
              color: '#0C192B',
              paddingVertical: 0,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#657080" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            flexDirection: 'row',
            marginTop: 12,
            marginHorizontal: -20,
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingRight: 30 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeTab === 'all' ? '#19D3E6' : '#FFFDF8',
              borderColor: activeTab === 'all' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: activeTab === 'all' ? '#0C192B' : '#657080',
              }}
            >
              All · {allCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeTab === 'active' ? '#19D3E6' : '#FFFDF8',
              borderColor: activeTab === 'active' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: activeTab === 'active' ? '#0C192B' : '#657080',
              }}
            >
              Active · {activeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('notice_period')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeTab === 'notice_period' ? '#19D3E6' : '#FFFDF8',
              borderColor: activeTab === 'notice_period' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: activeTab === 'notice_period' ? '#0C192B' : '#657080',
              }}
            >
              Notice · {noticeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('checked_out')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeTab === 'checked_out' ? '#19D3E6' : '#FFFDF8',
              borderColor: activeTab === 'checked_out' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: activeTab === 'checked_out' ? '#0C192B' : '#657080',
              }}
            >
              Checked out · {checkedOutCount}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F5330" />
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 8 }}>
            Loading tenants...
          </Text>
        </View>
      ) : filteredTenants.length === 0 ? (
        /* Empty State */
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: '#D1F4F9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Users size={36} color="#4F5330" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', textAlign: 'center' }}>
            {searchQuery ? 'No matching tenants' : 'No tenants yet'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#657080',
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 24,
              paddingHorizontal: 16,
            }}
          >
            {searchQuery
              ? 'Try adjusting your search keywords or clear filters.'
              : 'Add your first tenant to a vacant bed. It takes under 2 minutes.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/tenants/add' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#4F5330',
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 9999,
              shadowColor: '#4F5330',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 6 }}>
              Add tenant
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#4F5330']}
              tintColor="#4F5330"
            />
          }
        >
          {filteredTenants.map(tenant => {
            const bedNumber =
              typeof tenant.currentBed === 'object' ? tenant.currentBed?.bedNumber : 'Bed';
            const dueAmount = tenant.balanceDuePaise ?? 0;
            const isCheckedOut = tenant.status === 'checked_out';
            const isNotice = tenant.status === 'notice_period';

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
                activeOpacity={0.75}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                {/* Left: Avatar */}
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: '#D1F4F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0799AA' }}>
                      {getInitials(tenant.fullName)}
                    </Text>
                  </View>

                  {/* Middle: Details */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: '800', color: '#0C192B', lineHeight: 20 }}
                    >
                      {tenant.fullName}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginTop: 2 }}
                    >
                      {subtitleText}
                    </Text>

                    {/* Status Pill & Property Tag */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      {(selectedPropertyId === 'all' || !selectedProperty) &&
                        tenant.property?.name && (
                          <View
                            style={{
                              backgroundColor: '#EAE8DF',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 9999,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <Building size={10} color="#4F5330" />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: '#4F5330',
                                marginLeft: 4,
                              }}
                            >
                              {tenant.property.name}
                            </Text>
                          </View>
                        )}
                      {tenant.status === 'active' && (
                        <View
                          style={{
                            backgroundColor: '#F0FDF4',
                            borderWidth: 1,
                            borderColor: '#BBF7D0',
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            borderRadius: 9999,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                            Active
                          </Text>
                        </View>
                      )}
                      {tenant.status === 'notice_period' && (
                        <View
                          style={{
                            backgroundColor: '#FEF3C7',
                            borderWidth: 1,
                            borderColor: '#FDE047',
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            borderRadius: 9999,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                            Notice
                          </Text>
                        </View>
                      )}
                      {tenant.status === 'checked_out' && (
                        <View
                          style={{
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            borderRadius: 9999,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#657080' }}>
                            Checked out
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right: Due / Paid / Settled + Menu */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8 }}>
                  <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                    {dueAmount > 0 ? (
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#BE123C' }}>
                        Due {formatINR(dueAmount)}
                      </Text>
                    ) : isCheckedOut ? (
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                        Settled
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#15803D' }}>
                        Paid
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setActionSheetTenant(tenant)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ padding: 4, borderRadius: 9999 }}
                  >
                    <MoreVertical size={20} color="#657080" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Action Button (+ Add tenant) - only shown when tenants list is not empty */}
      {filteredTenants.length > 0 && (
        <View style={{ position: 'absolute', bottom: 24, right: 20 }}>
          <TouchableOpacity
            onPress={() => router.push('/tenants/add' as any)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#4F5330',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderRadius: 9999,
              shadowColor: '#4F5330',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 6 }}>
              Add tenant
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Undo Floating Banner */}
      {undoToast.visible && (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            backgroundColor: '#0C192B',
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Check size={18} color="#19D3E6" strokeWidth={2.5} />
            <Text
              style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 }}
              numberOfLines={1}
            >
              {undoToast.tenantName} deleted
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleUndoDelete}
            style={{
              backgroundColor: '#1E293B',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <Text style={{ color: '#19D3E6', fontSize: 12, fontWeight: '800' }}>
              Undo · {undoToast.secondsLeft}s
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Bottom Sheet */}
      <Modal
        visible={actionSheetTenant !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetTenant(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActionSheetTenant(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#FFFDF8',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingBottom: 32,
              paddingHorizontal: 24,
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
            }}
          >
            {/* Sheet Handle */}
            <View
              style={{
                width: 48,
                height: 5,
                backgroundColor: '#E5DDCD',
                borderRadius: 9999,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            {/* Tenant Info Header */}
            {actionSheetTenant && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5DDCD',
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#D1F4F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0799AA' }}>
                    {getInitials(actionSheetTenant.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                    {actionSheetTenant.fullName}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F3ECE0',
              }}
            >
              <User size={20} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                View profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const id = actionSheetTenant?._id;
                setActionSheetTenant(null);
                if (id) router.push(`/tenant/edit/${id}` as any);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F3ECE0',
              }}
            >
              <Edit2 size={20} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                Edit tenant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => actionSheetTenant && handleWhatsAppAction(actionSheetTenant)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F3ECE0',
              }}
            >
              <MessageSquare size={20} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                Send WhatsApp reminder
              </Text>
            </TouchableOpacity>

            {actionSheetTenant?.status === 'notice_period' ? (
              <TouchableOpacity
                onPress={() => actionSheetTenant && handleCancelNotice(actionSheetTenant)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3ECE0',
                }}
              >
                <Clock size={20} color="#B45309" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#B45309', marginLeft: 14 }}>
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3ECE0',
                }}
              >
                <Clock size={20} color="#0C192B" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                  Start notice period
                </Text>
              </TouchableOpacity>
            )}

            {actionSheetTenant?.status !== 'checked_out' && (
              <TouchableOpacity
                onPress={() => {
                  const id = actionSheetTenant?._id;
                  setActionSheetTenant(null);
                  if (id) router.push(`/checkout/${id}`);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3ECE0',
                }}
              >
                <LogOut size={20} color="#BE123C" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C', marginLeft: 14 }}>
                  Checkout tenant
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => actionSheetTenant && handleDeletePress(actionSheetTenant)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            >
              <Trash2 size={20} color="#DC2626" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626', marginLeft: 14 }}>
                Delete tenant
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* "Can't delete yet" Modal */}
      <Modal
        visible={cantDeleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCantDeleteModal(prev => ({ ...prev, visible: false }))}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={32} color="#B45309" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0C192B',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Can’t delete yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#657080',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              {cantDeleteModal.message}
            </Text>

            <TouchableOpacity
              onPress={() => {
                const tenantId = cantDeleteModal.tenant?._id;
                setCantDeleteModal(prev => ({ ...prev, visible: false }));
                if (tenantId) router.push(`/checkout/${tenantId}`);
              }}
              style={{
                width: '100%',
                backgroundColor: '#4F5330',
                paddingVertical: 14,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                Go to checkout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCantDeleteModal(prev => ({ ...prev, visible: false }))}
              style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#657080', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
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
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              overflow: 'hidden',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginBottom: 4 }}>
              Start Notice Period
            </Text>
            <Text style={{ fontSize: 13, color: '#657080', marginBottom: 16 }}>
              Set expected departure date for {noticeModal.tenant?.fullName}.
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
              Notice Duration
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[15, 30, 45].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setNoticeModal(prev => ({ ...prev, days: d }))}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: d === 45 ? 0 : 8,
                    backgroundColor: noticeModal.days === d ? '#19D3E6' : '#FAF7F2',
                    borderColor: noticeModal.days === d ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#0C192B',
                    }}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Notes (Optional)
            </Text>
            <TextInput
              value={noticeModal.notes}
              onChangeText={text => setNoticeModal(prev => ({ ...prev, notes: text }))}
              placeholder="e.g. Relocating for new job"
              placeholderTextColor="#8E98A0"
              style={{
                backgroundColor: '#FAF7F2',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 13,
                color: '#0C192B',
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1.5,
                  borderColor: '#E8DFC9',
                  borderRadius: 9999,
                  alignItems: 'center',
                  backgroundColor: '#FFFDF8',
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartNoticeSubmit}
                disabled={noticeModal.isSubmitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  alignItems: 'center',
                  marginLeft: 8,
                }}
              >
                {noticeModal.isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    Confirm Notice
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <DecorativeWaveFooter
              height={36}
              style={{ marginTop: 14, marginHorizontal: -24, marginBottom: -24 }}
            />
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal for Cancelling Notice Period */}
      {confirmCancelNoticeTenant && (
        <ConfirmActionModal
          visible={!!confirmCancelNoticeTenant}
          onClose={() => setConfirmCancelNoticeTenant(null)}
          onConfirm={handleExecuteCancelNotice}
          variant="warning"
          icon={<Clock size={28} color="#D97706" strokeWidth={2.3} />}
          title="Cancel Notice Period?"
          message={`Remove notice period for ${confirmCancelNoticeTenant.fullName}? Status will return to active occupied.`}
          confirmLabel="Restore Tenant"
        />
      )}

      {/* Modern In-App Success Feedback Modal */}
      <SuccessActionModal
        visible={successModal.visible}
        onClose={() => setSuccessModal(prev => ({ ...prev, visible: false }))}
        title={successModal.title}
        message={successModal.message}
        highlightCard={successModal.highlightCard}
      />

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
