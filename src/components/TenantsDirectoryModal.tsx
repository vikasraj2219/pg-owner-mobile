import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { X, Search, Users, Phone, MessageSquare, Building, ShieldCheck } from 'lucide-react-native';
import { ITenantListItem, IProperty } from '../types/api';
import { useTenants } from '../hooks/useTenants';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';

interface TenantsDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
  properties: IProperty[];
  selectedPropertyId?: string | null;
  onCheckoutTenant?: (tenantId: string) => void;
}

export const TenantsDirectoryModal: React.FC<TenantsDirectoryModalProps> = ({
  visible,
  onClose,
  properties,
  selectedPropertyId,
  onCheckoutTenant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'notice_period' | 'checked_out'
  >('all');
  const [filterPropertyId, setFilterPropertyId] = useState<string | null>(
    selectedPropertyId || null,
  );

  // Fetch tenants
  const { tenants, isLoading, isRefetching, refetch } = useTenants({
    propertyId: filterPropertyId || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery.trim() || undefined,
  });

  // Client-side search filtering as an instant reactive layer
  const filteredTenants = useMemo(() => {
    let list = tenants;

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

    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }

    return list;
  }, [tenants, searchQuery, statusFilter]);

  const activeCount = useMemo(() => tenants.filter(t => t.status === 'active').length, [tenants]);
  const noticeCount = useMemo(
    () => tenants.filter(t => t.status === 'notice_period').length,
    [tenants],
  );

  const getInitials = (name?: string) => {
    if (!name) return 'TN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Tenant phone number is not available.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    void Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  const handleWhatsApp = (phone: string, fullName: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Tenant phone number is not available.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${fullName},\n\nHope you are doing well at PG Living. Please let us know if you need any assistance!`;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  const getBedInfo = (tenant: ITenantListItem) => {
    if (typeof tenant.currentBed === 'object' && tenant.currentBed) {
      const bed = tenant.currentBed;
      const room = bed.room;
      if (room) {
        return `Bed ${bed.bedNumber} · Room ${room.roomNumber} (Floor ${room.floorNumber})`;
      }
      return `Bed ${bed.bedNumber}`;
    }
    return 'Bed Assigned';
  };

  const getPropertyName = (tenant: ITenantListItem) => {
    if (typeof tenant.property === 'object' && tenant.property?.name) {
      return tenant.property.name;
    }
    const propId =
      typeof tenant.property === 'string'
        ? tenant.property
        : (tenant.property as { _id?: string } | undefined)?._id;
    const prop = properties.find(p => p._id === propId);
    return prop?.name || 'PG Property';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#F8F9FA]">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-200/80">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-2xl bg-[#E8F5EE] items-center justify-center">
                <Users size={22} color="#0A6C50" strokeWidth={2.2} />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-slate-900">Tenants Directory</Text>
                <Text className="text-xs font-semibold text-slate-500">
                  {tenants.length} total · {activeCount} active · {noticeCount} on notice
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
            >
              <X size={20} color="#475569" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-100/90 rounded-xl px-3 py-2 border border-slate-200/60 mb-2.5">
            <Search size={18} color="#64748B" />
            <TextInput
              placeholder="Search by name, phone, bed, or room..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-sm text-slate-800"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Property Filter (if multiple properties exist) */}
          {properties.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <View className="flex-row gap-1.5 py-1">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFilterPropertyId(null)}
                  className={`px-3 py-1.5 rounded-full border ${
                    filterPropertyId === null
                      ? 'bg-[#0A6C50] border-[#0A6C50]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      filterPropertyId === null ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    All Properties ({properties.length})
                  </Text>
                </TouchableOpacity>

                {properties.map(p => (
                  <TouchableOpacity
                    key={p._id}
                    activeOpacity={0.8}
                    onPress={() => setFilterPropertyId(p._id)}
                    className={`px-3 py-1.5 rounded-full border ${
                      filterPropertyId === p._id
                        ? 'bg-[#0A6C50] border-[#0A6C50]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        filterPropertyId === p._id ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Status Filter Pills */}
          <View className="flex-row gap-1.5 pt-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full border ${
                statusFilter === 'all'
                  ? 'bg-slate-900 border-slate-900'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  statusFilter === 'all' ? 'text-white' : 'text-slate-600'
                }`}
              >
                All ({tenants.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-full border ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  statusFilter === 'active' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Active ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('notice_period')}
              className={`px-3 py-1 rounded-full border ${
                statusFilter === 'notice_period'
                  ? 'bg-amber-600 border-amber-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  statusFilter === 'notice_period' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Notice ({noticeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('checked_out')}
              className={`px-3 py-1 rounded-full border ${
                statusFilter === 'checked_out'
                  ? 'bg-slate-700 border-slate-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  statusFilter === 'checked_out' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content / Tenant List */}
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 60 }}
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
          {isLoading && !isRefetching ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#0A6C50" />
              <Text className="text-xs font-semibold text-slate-500 mt-3">
                Loading tenants directory...
              </Text>
            </View>
          ) : filteredTenants.length === 0 ? (
            <View className="py-20 items-center justify-center bg-white border border-slate-200/80 rounded-3xl p-8 mt-2 shadow-xs">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                <Users size={32} color="#94A3B8" />
              </View>
              <Text className="text-base font-bold text-slate-800 text-center mb-1">
                No tenants found
              </Text>
              <Text className="text-xs text-slate-500 text-center max-w-xs leading-5">
                {searchQuery
                  ? `No tenants match "${searchQuery}". Try a different name, phone, or bed number.`
                  : 'There are no tenants matching the selected filter in this property.'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredTenants.map(tenant => {
                const initials = getInitials(tenant.fullName);
                const bedInfo = getBedInfo(tenant);
                const propName = getPropertyName(tenant);
                const isOnNotice = tenant.status === 'notice_period';
                const isCheckedOut = tenant.status === 'checked_out';

                return (
                  <View
                    key={tenant._id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs"
                  >
                    {/* Top Row: Avatar, Name & Status Badge */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                            isOnNotice
                              ? 'bg-amber-100 border border-amber-200'
                              : isCheckedOut
                                ? 'bg-slate-100 border border-slate-200'
                                : 'bg-[#E8F5EE] border border-emerald-200'
                          }`}
                        >
                          <Text
                            className={`text-sm font-extrabold ${
                              isOnNotice
                                ? 'text-amber-800'
                                : isCheckedOut
                                  ? 'text-slate-600'
                                  : 'text-[#0A6C50]'
                            }`}
                          >
                            {initials}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-base font-extrabold text-slate-900"
                            numberOfLines={1}
                          >
                            {tenant.fullName}
                          </Text>
                          <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                            {tenant.phone}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        className={`px-2.5 py-1 rounded-full border ${
                          isOnNotice
                            ? 'bg-amber-50 border-amber-200'
                            : isCheckedOut
                              ? 'bg-slate-100 border-slate-200'
                              : 'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isOnNotice
                              ? 'text-amber-800'
                              : isCheckedOut
                                ? 'text-slate-600'
                                : 'text-emerald-800'
                          }`}
                        >
                          {isOnNotice
                            ? '🟡 On Notice'
                            : isCheckedOut
                              ? '⚪ Checked Out'
                              : '🟢 Active'}
                        </Text>
                      </View>
                    </View>

                    {/* Room & Bed Pill */}
                    <View className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Building size={14} color="#64748B" />
                        <Text className="text-xs font-bold text-slate-700 ml-1.5" numberOfLines={1}>
                          {bedInfo}
                        </Text>
                      </View>
                      <Text className="text-[11px] font-semibold text-slate-400" numberOfLines={1}>
                        {propName}
                      </Text>
                    </View>

                    {/* Financial & KYC Info Row */}
                    <View className="flex-row items-center justify-between border-t border-slate-100 pt-2.5 mb-3">
                      <View>
                        <Text className="text-[11px] font-medium text-slate-500 uppercase">
                          Monthly Rent
                        </Text>
                        <Text className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {formatINR(tenant.monthlyRentPaise)}
                        </Text>
                      </View>

                      <View className="items-center">
                        <Text className="text-[11px] font-medium text-slate-500 uppercase">
                          Deposit Paid
                        </Text>
                        <Text className="text-sm font-extrabold text-[#0A6C50] mt-0.5">
                          {formatINR(tenant.depositPaidPaise || tenant.depositPaise)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[11px] font-medium text-slate-500 uppercase">
                          Joined
                        </Text>
                        <Text className="text-xs font-semibold text-slate-700 mt-0.5">
                          {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* KYC Badge & Emergency Contact (if available) */}
                    {(tenant.kycMaskedNumber || tenant.emergencyPhone) && (
                      <View className="flex-row items-center justify-between bg-slate-50/80 rounded-lg px-2.5 py-1.5 mb-3">
                        {tenant.kycMaskedNumber ? (
                          <View className="flex-row items-center">
                            <ShieldCheck size={12} color="#0A6C50" />
                            <Text className="text-[11px] font-medium text-slate-600 ml-1">
                              {tenant.kycDocType ? tenant.kycDocType.toUpperCase() : 'KYC'}:{' '}
                              {tenant.kycMaskedNumber}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        {tenant.emergencyPhone && (
                          <Text className="text-[11px] font-medium text-slate-500">
                            Emergency: {tenant.emergencyPhone}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Action Buttons: Call, WhatsApp, Checkout */}
                    <View className="flex-row items-center gap-2 pt-1 border-t border-slate-100">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCall(tenant.phone)}
                        className="flex-1 bg-slate-100/90 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Phone size={15} color="#334155" />
                        <Text className="text-xs font-bold text-slate-800">Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleWhatsApp(tenant.phone, tenant.fullName)}
                        className="flex-1 bg-emerald-50 border border-emerald-200 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={15} color="#0A6C50" />
                        <Text className="text-xs font-bold text-[#0A6C50]">WhatsApp</Text>
                      </TouchableOpacity>

                      {onCheckoutTenant && !isCheckedOut && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            onClose();
                            onCheckoutTenant(tenant._id);
                          }}
                          className="bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl flex-row items-center justify-center"
                        >
                          <Text className="text-xs font-bold text-slate-600">Checkout</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};
