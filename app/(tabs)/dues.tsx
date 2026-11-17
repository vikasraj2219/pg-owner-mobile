import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  Share2,
  Search,
  X,
  Eye,
  Building,
  ChevronDown,
  Wallet,
} from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useInvoices } from '../../src/hooks/useInvoices';
import { useMatrix } from '../../src/hooks/useMatrix';
import { formatINR } from '../../src/utils/currency';
import { formatSafeMonthYear, formatSafeDate } from '../../src/utils/date';
import { generateAndShareReceipt } from '../../src/utils/pdfReceipt';
import { resolveRoomAndBed } from '../../src/utils/bedResolution';
import { RecordPaymentModal } from '../../src/components/RecordPaymentModal';
import { DynamicUpiQrModal } from '../../src/components/DynamicUpiQrModal';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { DueInvoiceItem } from '../../src/types/api';

export default function DuesScreen() {
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, properties, setSelectedPropertyId } =
    useProperties();
  const [duesPropertyFilterId, setDuesPropertyFilterId] = useState<string | null>(
    selectedPropertyId === 'all' ? null : selectedPropertyId || null,
  );
  const [filter, setFilter] = useState<'all' | 'overdue' | 'unpaid' | 'paid'>('overdue');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPropertySwitcherOpen, setIsPropertySwitcherOpen] = useState(false);

  // Modals state
  const [paymentInvoice, setPaymentInvoice] = useState<DueInvoiceItem | null>(null);
  const [qrInvoice, setQrInvoice] = useState<DueInvoiceItem | null>(null);

  const { invoices, isLoading, isRefetching, refetch, markPaid, isMarkingPaid } = useInvoices(
    duesPropertyFilterId,
    filter,
    searchQuery,
  );

  const activeDuesProperty = useMemo(() => {
    if (!duesPropertyFilterId) return selectedProperty || properties[0] || null;
    return properties.find(p => p._id === duesPropertyFilterId) || selectedProperty || null;
  }, [duesPropertyFilterId, properties, selectedProperty]);

  const { matrixData } = useMatrix(activeDuesProperty?._id || null);

  const currentMonthYear = useMemo(() => {
    return formatSafeMonthYear();
  }, []);

  const totalOutstandingPaise = useMemo(() => {
    return invoices.reduce((sum, item) => {
      if (item.status === 'paid' || item.status === 'canceled') return sum;
      return sum + (item.balanceDuePaise ?? item.totalAmountPaise ?? 0);
    }, 0);
  }, [invoices]);

  const _unpaidCount = useMemo(() => {
    return invoices.filter(item => item.status !== 'paid' && item.status !== 'canceled').length;
  }, [invoices]);

  const getBedInfo = (item: DueInvoiceItem) => {
    return resolveRoomAndBed({
      tenantId: item.tenant?._id,
      tenantName: item.tenant?.fullName,
      currentBed: item.tenant?.currentBed,
      matrixData,
    });
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return 'TN';
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((word: string) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSendWhatsApp = (item: DueInvoiceItem) => {
    const tenantPhone = item.tenant?.phone || '';
    const tenantName = item.tenant?.fullName || 'Tenant';
    const bedInfo = getBedInfo(item);
    const amountPaise = String(item.balanceDuePaise || item.totalAmountPaise || 850000);
    const overdueDays = String(item.overdueDays ?? 0);
    const itemProperty = properties.find(p => p._id === item.property?._id) || activeDuesProperty;
    const upiVpa = itemProperty?.upiVpa || activeDuesProperty?.upiVpa || '';

    const daysUntilDue = item.dueDate
      ? Math.round(
          (new Date(item.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    const reminderType =
      daysUntilDue > 0 ? 'pre_reminder' : daysUntilDue === 0 ? 'due_today' : 'overdue';

    router.push({
      pathname: '/reminder/[id]' as any,
      params: {
        id: item._id,
        tenantName,
        phone: tenantPhone,
        bedNo: bedInfo.bedLabel,
        amountPaise,
        overdueDays,
        upiVpa,
        dueDate: item.dueDate,
        daysRemaining: String(daysUntilDue),
        type: reminderType,
      },
    });
  };

  const handleViewReceipt = (item: DueInvoiceItem) => {
    const receiptNo = item.invoiceNumber.replace('INV-', 'RCP-');
    const tenantName = item.tenant?.fullName || 'Tenant';
    const bedInfo = getBedInfo(item);
    const amountPaise = String(item.amountPaidPaise || item.totalAmountPaise || 850000);
    const date = item.paidAt || item.dueDate || new Date().toISOString();
    const itemProperty = properties.find(p => p._id === item.property?._id) || activeDuesProperty;
    const propertyName = item.property?.name || itemProperty?.name || 'PG Property';
    const propertyAddress = itemProperty?.address || '';
    const forMonth =
      item.items?.[0]?.description ||
      (item.dueDate ? `${formatSafeMonthYear(new Date(item.dueDate))} rent` : 'Rent payment');
    const method = item.paymentMethod?.toUpperCase() || 'UPI';

    router.push({
      pathname: '/receipt/[id]' as any,
      params: {
        id: item._id,
        receiptNo,
        tenantName,
        bedNo: bedInfo.formattedLabel,
        amountPaise,
        date,
        propertyName,
        propertyAddress,
        forMonth,
        method,
      },
    });
  };

  const handleSharePaidReceipt = async (item: DueInvoiceItem) => {
    try {
      const bedInfo = getBedInfo(item);
      const itemProperty = properties.find(p => p._id === item.property?._id) || activeDuesProperty;
      await generateAndShareReceipt({
        receiptNo: item.invoiceNumber.replace('INV-', 'RCP-'),
        tenantName: item.tenant?.fullName || 'Tenant',
        bedNo: bedInfo.formattedLabel,
        amountPaise: item.amountPaidPaise || item.totalAmountPaise,
        date: formatSafeDate(item.paidAt || item.dueDate),
        property: item.property?.name || itemProperty?.name || 'PG Property',
        propertyAddress: itemProperty?.address || '',
        forMonth:
          item.items?.[0]?.description ||
          (item.dueDate ? `${formatSafeMonthYear(new Date(item.dueDate))} rent` : 'Rent Payment'),
        paymentMethod: item.paymentMethod || 'UPI',
      });
    } catch (_err) {
      Alert.alert('Error', 'Unable to generate receipt PDF.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      <StatusBar style="dark" />

      {/* Screen Header with Nilaaya Brand Styling */}
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
        {/* Title & Month Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#0C192B',
              letterSpacing: -0.5,
            }}
          >
            Dues
          </Text>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: '#FAF7F2',
              borderWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330' }}>
              {currentMonthYear}
            </Text>
          </View>
        </View>

        {/* Subtitle / Property Switcher */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsPropertySwitcherOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
        >
          {searchQuery.trim().length > 0 ? (
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
              {invoices.length} invoice{invoices.length === 1 ? '' : 's'} matching &ldquo;
              {searchQuery}&rdquo;
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                {activeDuesProperty?.name || 'All Properties'}
              </Text>
              <ChevronDown size={14} color="#4F5330" style={{ marginLeft: 3 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Search Bar matching Tenants & Matrix Screen */}
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
            placeholder="Search tenant or invoice number..."
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

        {/* Status Filter Chips: Overdue, Unpaid, Paid, All */}
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
          {/* Overdue */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('overdue')}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: filter === 'overdue' ? '#19D3E6' : '#FFFDF8',
              borderColor: filter === 'overdue' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: filter === 'overdue' ? '#0C192B' : '#657080',
              }}
            >
              Overdue
            </Text>
          </TouchableOpacity>

          {/* Unpaid */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('unpaid')}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: filter === 'unpaid' ? '#19D3E6' : '#FFFDF8',
              borderColor: filter === 'unpaid' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: filter === 'unpaid' ? '#0C192B' : '#657080',
              }}
            >
              Unpaid
            </Text>
          </TouchableOpacity>

          {/* Paid */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('paid')}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: filter === 'paid' ? '#19D3E6' : '#FFFDF8',
              borderColor: filter === 'paid' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: filter === 'paid' ? '#0C192B' : '#657080',
              }}
            >
              Paid
            </Text>
          </TouchableOpacity>

          {/* All */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('all')}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: filter === 'all' ? '#19D3E6' : '#FFFDF8',
              borderColor: filter === 'all' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: filter === 'all' ? '#0C192B' : '#657080',
              }}
            >
              All
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
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
        {/* Total Outstanding Card matching Reference */}
        <View
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 18,
            paddingHorizontal: 20,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {/* Total Outstanding Brand Icon */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: '#FAF7F2',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Wallet size={26} color="#4F5330" strokeWidth={2.3} />
          </View>

          {/* Texts: Label on top, Large Amount below */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0C192B' }}>
              Total Outstanding
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#0C192B',
                letterSpacing: -0.5,
                marginTop: 2,
              }}
            >
              {formatINR(totalOutstandingPaise)}
            </Text>
          </View>
        </View>

        {/* Loading Spinner */}
        {isLoading && !isRefetching && (
          <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#4F5330" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#657080', marginTop: 12 }}>
              Loading invoices…
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && invoices.length === 0 && (
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 24,
              padding: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 16,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#FAF7F2',
                borderWidth: 1,
                borderColor: '#D0D7B4',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <CheckCircle2 size={32} color="#4F5330" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B', marginBottom: 4 }}>
              {filter === 'overdue' ? 'No Overdue Rents' : 'No Invoices Found'}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#657080',
                textAlign: 'center',
                maxWidth: 280,
              }}
            >
              {filter === 'overdue'
                ? 'All tenant payments for this PG are on schedule.'
                : 'There are no invoices matching the selected filter.'}
            </Text>
          </View>
        )}

        {/* Invoices List */}
        {!isLoading &&
          invoices.map(item => {
            const tenantName = item.tenant?.fullName || 'Tenant';
            const initials = getInitials(tenantName);
            const bedInfo = getBedInfo(item);
            const bedName = bedInfo.formattedLabel;
            const dueDateFormatted = item.dueDate
              ? `Due ${formatSafeDate(item.dueDate)}`
              : 'Due Date';
            const amountFormatted = formatINR(item.balanceDuePaise || item.totalAmountPaise);

            const isPaid = item.status === 'paid';
            const overdueDays = item.overdueDays ?? 0;
            const daysUntilDue = item.dueDate
              ? Math.round(
                  (new Date(item.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;

            const statusLabel = isPaid
              ? 'Paid'
              : overdueDays > 0
                ? `${overdueDays} days overdue`
                : daysUntilDue === 0
                  ? 'Due today'
                  : daysUntilDue === 2
                    ? '2 days left (Pre-reminder)'
                    : daysUntilDue === 1
                      ? '1 day left'
                      : daysUntilDue > 2
                        ? `${daysUntilDue} days left`
                        : 'Upcoming';

            const statusBadgeBg = isPaid ? '#F0FDF4' : overdueDays > 0 ? '#FFF1F2' : '#FEF3C7';
            const statusBadgeBorder = isPaid ? '#86EFAC' : overdueDays > 0 ? '#FECDD3' : '#FDE68A';
            const statusBadgeText = isPaid ? '#15803D' : overdueDays > 0 ? '#E11D48' : '#B45309';

            return (
              <View
                key={item._id}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                {/* Top row with Avatar, Name, Bed, Amount */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
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
                        backgroundColor: '#D1F4F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0799AA' }}>
                        {initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}
                      >
                        {tenantName}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                      >
                        {bedName} · {dueDateFormatted}
                      </Text>
                      {item.items?.[0]?.description ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: '#4F5330',
                            marginTop: 2,
                          }}
                        >
                          {item.items[0].description}
                        </Text>
                      ) : null}
                      {!duesPropertyFilterId && item.property?.name && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FAF7F2',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            marginTop: 4,
                            alignSelf: 'flex-start',
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
                            {item.property.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                      {amountFormatted}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: statusBadgeBg,
                        borderWidth: 1,
                        borderColor: statusBadgeBorder,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: statusBadgeText }}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions: WhatsApp + QR Code + Mark received */}
                {!isPaid ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}
                  >
                    {/* WhatsApp 1-tap reminder */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleSendWhatsApp(item)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#F0FDF4',
                        borderWidth: 1,
                        borderColor: '#86EFAC',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MessageCircle size={19} color="#15803D" strokeWidth={2.2} />
                    </TouchableOpacity>

                    {/* Show Dynamic UPI QR Code */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setQrInvoice(item)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#FAF7F2',
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <QrCode size={19} color="#4F5330" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Mark Received Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPaymentInvoice(item)}
                      disabled={isMarkingPaid}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#19D3E6',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isMarkingPaid ? (
                        <ActivityIndicator size="small" color="#0C192B" />
                      ) : (
                        <Text style={{ color: '#0C192B', fontWeight: '800', fontSize: 14 }}>
                          Mark received
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      marginTop: 12,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#E5DDCD',
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewReceipt(item)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#FAF7F2',
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                      }}
                    >
                      <Eye size={14} color="#0C192B" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>
                        View Receipt
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleSharePaidReceipt(item)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#FAF7F2',
                        borderWidth: 1,
                        borderColor: '#D0D7B4',
                      }}
                    >
                      <Share2 size={14} color="#4F5330" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330' }}>
                        Share Receipt PDF
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>

      {/* Record Payment Sheet Modal */}
      <RecordPaymentModal
        visible={!!paymentInvoice}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onRecordPayment={payload => markPaid(payload)}
        isSubmitting={isMarkingPaid}
      />

      {/* Dynamic UPI QR Modal */}
      {qrInvoice && (
        <DynamicUpiQrModal
          visible={!!qrInvoice}
          onClose={() => setQrInvoice(null)}
          upiVpa={selectedProperty?.upiVpa || qrInvoice.property?.upiVpa || ''}
          amountPaise={qrInvoice.balanceDuePaise || qrInvoice.totalAmountPaise}
          tenantName={qrInvoice.tenant?.fullName || 'Tenant'}
          rentPaise={qrInvoice.balanceDuePaise || qrInvoice.totalAmountPaise}
          onMarkReceived={() => {
            const target = qrInvoice;
            setQrInvoice(null);
            setPaymentInvoice(target);
          }}
        />
      )}

      {/* Property Switcher Modal */}
      <PropertySwitcherModal
        visible={isPropertySwitcherOpen}
        onClose={() => setIsPropertySwitcherOpen(false)}
        properties={properties}
        selectedPropertyId={duesPropertyFilterId || 'all'}
        onSelectProperty={id => {
          setDuesPropertyFilterId(id === 'all' ? null : id);
          setSelectedPropertyId(id);
        }}
        onOpenAddProperty={() => {
          setIsPropertySwitcherOpen(false);
          router.push('/(tabs)/matrix' as any);
        }}
      />
    </SafeAreaView>
  );
}
