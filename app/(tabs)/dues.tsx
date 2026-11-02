import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useInvoices } from '../../src/hooks/useInvoices';
import { formatINR } from '../../src/utils/currency';
import { sendRentReminder } from '../../src/utils/whatsapp';
import { DueInvoiceItem } from '../../src/types/api';

export default function DuesScreen() {
  const { selectedProperty, selectedPropertyId } = useProperties();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'unpaid' | 'paid'>('overdue');

  const { invoices, isLoading, isRefetching, refetch, markPaid, isMarkingPaid } = useInvoices(
    selectedPropertyId,
    filter,
  );

  const currentMonthYear = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, []);

  const totalOutstandingPaise = useMemo(() => {
    return invoices.reduce((sum, item) => {
      if (item.status === 'paid' || item.status === 'canceled') return sum;
      return sum + (item.balanceDuePaise ?? item.totalAmountPaise ?? 0);
    }, 0);
  }, [invoices]);

  const unpaidCount = useMemo(() => {
    return invoices.filter(item => item.status !== 'paid' && item.status !== 'canceled').length;
  }, [invoices]);

  const getBedLabel = (item: DueInvoiceItem) => {
    const bedObj = item.tenant?.currentBed;
    if (typeof bedObj === 'object' && bedObj && 'bedNumber' in bedObj) {
      return `Bed ${bedObj.bedNumber}`;
    }
    return 'Bed';
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
    const tenantPhone = item.tenant?.phone;
    const tenantName = item.tenant?.fullName || 'Tenant';
    const bedName = getBedLabel(item);
    const amountPaise = item.balanceDuePaise || item.totalAmountPaise;
    const upiVpa = selectedProperty?.upiVpa || '';

    if (!tenantPhone) {
      Alert.alert('Phone Missing', `No phone number available for ${tenantName}.`);
      return;
    }

    sendRentReminder(tenantPhone, tenantName, bedName, amountPaise, upiVpa);
  };

  const handleMarkReceived = (item: DueInvoiceItem) => {
    const tenantName = item.tenant?.fullName || 'Tenant';
    const bedName = getBedLabel(item);
    const amountStr = formatINR(item.balanceDuePaise || item.totalAmountPaise);

    Alert.alert(
      'Mark Rent as Received',
      `Confirm receipt of ${amountStr} from ${tenantName} (${bedName})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Received',
          onPress: async () => {
            try {
              await markPaid({ invoiceId: item._id });
              Alert.alert('Payment Recorded', `Receipt generated for ${tenantName}.`);
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to record payment. Please try again.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
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
        {/* Header Title & Month */}
        <View className="mb-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">Dues</Text>
          <Text className="text-sm font-medium text-slate-600 mt-1">{currentMonthYear}</Text>
        </View>

        {/* Total Outstanding Card */}
        <View className="bg-white border border-slate-200/80 rounded-2xl p-4 flex-row items-center justify-between mb-4 shadow-xs">
          <Text className="text-sm font-semibold text-slate-700">
            Total outstanding · {unpaidCount} tenant{unpaidCount === 1 ? '' : 's'}
          </Text>
          <Text className="text-2xl font-extrabold text-[#BE123C]">
            {formatINR(totalOutstandingPaise)}
          </Text>
        </View>

        {/* Filter Pills */}
        <View className="flex-row items-center gap-2 mb-4 flex-wrap">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('all')}
            className={`px-4 py-2 rounded-full ${
              filter === 'all' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${filter === 'all' ? 'text-white' : 'text-slate-800'}`}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-full ${
              filter === 'overdue' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                filter === 'overdue' ? 'text-white' : 'text-slate-800'
              }`}
            >
              Overdue (&gt;5 days)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('unpaid')}
            className={`px-4 py-2 rounded-full ${
              filter === 'unpaid' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                filter === 'unpaid' ? 'text-white' : 'text-slate-800'
              }`}
            >
              Unpaid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('paid')}
            className={`px-4 py-2 rounded-full ${
              filter === 'paid' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${filter === 'paid' ? 'text-white' : 'text-slate-800'}`}
            >
              Paid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner */}
        {isLoading && !isRefetching && (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 font-medium text-sm mt-3">Loading invoices…</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && invoices.length === 0 && (
          <View className="bg-white border border-slate-200/80 rounded-3xl p-8 items-center justify-center my-4">
            <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-3">
              <CheckCircle2 size={32} color="#0A6C50" />
            </View>
            <Text className="text-base font-bold text-slate-900 mb-1">
              {filter === 'overdue' ? 'No Overdue Rents' : 'No Invoices Found'}
            </Text>
            <Text className="text-xs text-slate-500 text-center">
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
            const bedName = getBedLabel(item);
            const dueDateFormatted = item.dueDate
              ? `Due ${new Date(item.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}`
              : 'Due Date';
            const amountFormatted = formatINR(item.balanceDuePaise || item.totalAmountPaise);

            const isPaid = item.status === 'paid';
            const overdueDays = item.overdueDays ?? 0;
            const overdueLabel = isPaid
              ? 'Paid'
              : overdueDays > 0
                ? `${overdueDays} days overdue`
                : overdueDays === 0
                  ? 'Due today'
                  : 'Upcoming';

            return (
              <View
                key={item._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-3 shadow-xs"
              >
                {/* Top row with Avatar, Name, Bed, Amount */}
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-11 h-11 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
                      <Text className="text-sm font-bold text-slate-700">{initials}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                        {tenantName}
                      </Text>
                      <Text className="text-xs font-medium text-slate-500 mt-0.5">
                        {bedName} · {dueDateFormatted}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-lg font-extrabold text-slate-900">{amountFormatted}</Text>
                    <Text
                      className={`text-xs font-bold mt-0.5 ${
                        isPaid ? 'text-[#0A6C50]' : 'text-[#BE123C]'
                      }`}
                    >
                      {overdueLabel}
                    </Text>
                  </View>
                </View>

                {/* Actions: WhatsApp + Mark received */}
                {!isPaid && (
                  <View className="flex-row items-center gap-2.5 mt-3.5">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleSendWhatsApp(item)}
                      className="w-12 h-11 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl items-center justify-center"
                    >
                      <MessageCircle size={20} color="#0A6C50" strokeWidth={2.2} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleMarkReceived(item)}
                      disabled={isMarkingPaid}
                      className="flex-1 h-11 bg-[#0A6C50] rounded-xl items-center justify-center shadow-xs"
                    >
                      {isMarkingPaid ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white font-bold text-sm">Mark received</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}
