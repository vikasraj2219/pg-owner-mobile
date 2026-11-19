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
  Image,
} from 'react-native';
import { X, Search, Users, Phone, MessageSquare, Building, ShieldCheck } from 'lucide-react-native';
import { ITenantListItem, IProperty } from '../types/api';
import { useTenants } from '../hooks/useTenants';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { getTenantAvatar } from '../utils/assetImages';

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
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#FAF5EB',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  backgroundColor: '#D1F4F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={22} color="#0799AA" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B' }}>
                  Tenants Directory
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 1 }}>
                  {tenants.length} total · {activeCount} active · {noticeCount} on notice
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#0C192B" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFDF8',
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              marginBottom: 10,
            }}
          >
            <Search size={18} color="#657080" />
            <TextInput
              placeholder="Search by name, phone, bed, or room..."
              placeholderTextColor="#8C939D"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#0C192B' }}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#657080" />
              </TouchableOpacity>
            )}
          </View>

          {/* Property Filter (if multiple properties exist) */}
          {properties.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFilterPropertyId(null)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 9999,
                    borderWidth: 1,
                    backgroundColor: filterPropertyId === null ? '#19D3E6' : '#FFFDF8',
                    borderColor: filterPropertyId === null ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: filterPropertyId === null ? '800' : '600',
                      color: filterPropertyId === null ? '#0C192B' : '#657080',
                    }}
                  >
                    All Properties ({properties.length})
                  </Text>
                </TouchableOpacity>

                {properties.map(p => (
                  <TouchableOpacity
                    key={p._id}
                    activeOpacity={0.8}
                    onPress={() => setFilterPropertyId(p._id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                      borderWidth: 1,
                      backgroundColor: filterPropertyId === p._id ? '#19D3E6' : '#FFFDF8',
                      borderColor: filterPropertyId === p._id ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: filterPropertyId === p._id ? '800' : '600',
                        color: filterPropertyId === p._id ? '#0C192B' : '#657080',
                      }}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Status Filter Pills */}
          <View style={{ flexDirection: 'row', gap: 6, paddingTop: 4 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('all')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: statusFilter === 'all' ? '#19D3E6' : '#FFFDF8',
                borderColor: statusFilter === 'all' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: statusFilter === 'all' ? '800' : '600',
                  color: statusFilter === 'all' ? '#0C192B' : '#657080',
                }}
              >
                All ({tenants.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('active')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: statusFilter === 'active' ? '#19D3E6' : '#FFFDF8',
                borderColor: statusFilter === 'active' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: statusFilter === 'active' ? '800' : '600',
                  color: statusFilter === 'active' ? '#0C192B' : '#657080',
                }}
              >
                Active ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('notice_period')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: statusFilter === 'notice_period' ? '#19D3E6' : '#FFFDF8',
                borderColor: statusFilter === 'notice_period' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: statusFilter === 'notice_period' ? '800' : '600',
                  color: statusFilter === 'notice_period' ? '#0C192B' : '#657080',
                }}
              >
                Notice ({noticeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setStatusFilter('checked_out')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: statusFilter === 'checked_out' ? '#19D3E6' : '#FFFDF8',
                borderColor: statusFilter === 'checked_out' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: statusFilter === 'checked_out' ? '800' : '600',
                  color: statusFilter === 'checked_out' ? '#0C192B' : '#657080',
                }}
              >
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content / Tenant List */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#4F5330"
              colors={['#4F5330']}
            />
          }
        >
          {isLoading && !isRefetching ? (
            <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#4F5330" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 12 }}>
                Loading tenants directory...
              </Text>
            </View>
          ) : filteredTenants.length === 0 ? (
            <View
              style={{
                paddingVertical: 60,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 24,
                padding: 24,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#FAF5EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Users size={30} color="#657080" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#0C192B',
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                No tenants found
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#657080',
                  textAlign: 'center',
                  maxWidth: 280,
                  lineHeight: 18,
                }}
              >
                {searchQuery
                  ? `No tenants match "${searchQuery}". Try a different name, phone, or bed number.`
                  : 'There are no tenants matching the selected filter in this property.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredTenants.map(tenant => {
                const bedInfo = getBedInfo(tenant);
                const propName = getPropertyName(tenant);
                const isOnNotice = tenant.status === 'notice_period';
                const isCheckedOut = tenant.status === 'checked_out';

                return (
                  <View
                    key={tenant._id}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    {/* Top Row: Avatar, Name & Status Badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Image
                            source={getTenantAvatar(tenant)}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}
                            numberOfLines={1}
                          >
                            {tenant.fullName}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '500',
                              color: '#657080',
                              marginTop: 2,
                            }}
                          >
                            {tenant.phone}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 9999,
                          borderWidth: 1,
                          backgroundColor: isOnNotice
                            ? '#FEF3C7'
                            : isCheckedOut
                              ? '#FAF5EB'
                              : '#F0FDF4',
                          borderColor: isOnNotice
                            ? '#FDE047'
                            : isCheckedOut
                              ? '#E5DDCD'
                              : '#BBF7D0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isOnNotice ? '#B45309' : isCheckedOut ? '#657080' : '#15803D',
                          }}
                        >
                          {isOnNotice ? 'On Notice' : isCheckedOut ? 'Checked Out' : 'Active'}
                        </Text>
                      </View>
                    </View>

                    {/* Room & Bed Pill */}
                    <View
                      style={{
                        backgroundColor: '#FAF5EB',
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        <Building size={14} color="#657080" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: '#0C192B',
                            marginLeft: 6,
                          }}
                          numberOfLines={1}
                        >
                          {bedInfo}
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}
                        numberOfLines={1}
                      >
                        {propName}
                      </Text>
                    </View>

                    {/* Financial & KYC Info Row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTopWidth: 1,
                        borderTopColor: '#F0ECE1',
                        paddingTop: 10,
                        marginBottom: 12,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '600',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Monthly Rent
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '800',
                            color: '#0C192B',
                            marginTop: 2,
                          }}
                        >
                          {formatINR(tenant.monthlyRentPaise)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '600',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Deposit Paid
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '800',
                            color: '#4F5330',
                            marginTop: 2,
                          }}
                        >
                          {formatINR(tenant.depositPaidPaise || tenant.depositPaise)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '600',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Joined
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#0C192B',
                            marginTop: 2,
                          }}
                        >
                          {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* KYC Badge & Emergency Contact (if available) */}
                    {(tenant.kycMaskedNumber || tenant.emergencyPhone) && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#FAF5EB',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginBottom: 12,
                        }}
                      >
                        {tenant.kycMaskedNumber ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ShieldCheck size={12} color="#4F5330" />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '500',
                                color: '#657080',
                                marginLeft: 4,
                              }}
                            >
                              {tenant.kycDocType ? tenant.kycDocType.toUpperCase() : 'KYC'}:{' '}
                              {tenant.kycMaskedNumber}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        {tenant.emergencyPhone && (
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080' }}>
                            Emergency: {tenant.emergencyPhone}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Action Buttons: Call, WhatsApp, Checkout */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: '#F0ECE1',
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCall(tenant.phone)}
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFDF8',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Phone size={15} color="#0C192B" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>
                          Call
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleWhatsApp(tenant.phone, tenant.fullName)}
                        style={{
                          flex: 1,
                          backgroundColor: '#F0FDF4',
                          borderWidth: 1,
                          borderColor: '#BBF7D0',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <MessageSquare size={15} color="#15803D" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
                          WhatsApp
                        </Text>
                      </TouchableOpacity>

                      {onCheckoutTenant && !isCheckedOut && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            onClose();
                            onCheckoutTenant(tenant._id);
                          }}
                          style={{
                            backgroundColor: '#FFF1F2',
                            borderWidth: 1,
                            borderColor: '#FECDD3',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>
                            Checkout
                          </Text>
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
