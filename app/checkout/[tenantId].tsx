import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../../src/utils/currency';
import { getTenantByIdApi, vacateTenantApi } from '../../src/api/checkin';
import { ITenant, IInvoice } from '../../src/types/api';

export default function CheckoutScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tenant, setTenant] = useState<ITenant | null>(null);
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [deductions, setDeductions] = useState('0');

  useEffect(() => {
    let isMounted = true;
    async function loadTenantData() {
      if (!tenantId) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getTenantByIdApi(tenantId);
        if (isMounted) {
          setTenant(data.tenant);
          setInvoices(data.invoices || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load tenant checkout details.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTenantData();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  const depositPaise = tenant?.depositPaidPaise || tenant?.depositPaise || 0;

  const unpaidInvoicesPaise = useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'canceled')
      .reduce((sum, inv) => sum + (inv.balanceDuePaise || inv.totalAmountPaise || 0), 0);
  }, [invoices]);

  const deductionNumber = Math.max(0, parseFloat(deductions.replace(/,/g, '')) || 0);
  const deductionPaise = Math.round(deductionNumber * 100);

  const netRefundPaise = Math.max(0, depositPaise - unpaidInvoicesPaise - deductionPaise);

  const handleConfirmVacate = () => {
    if (!tenantId) return;

    const deductionClean = parseFloat(deductions.replace(/,/g, ''));
    if (isNaN(deductionClean) || deductionClean < 0) {
      Alert.alert(
        'Invalid Deduction',
        'Please enter a valid non-negative deduction amount (or 0).',
      );
      return;
    }

    const tenantName = tenant?.fullName || 'Tenant';

    Alert.alert(
      'Confirm Vacate & Settlement',
      `Net refund of ${formatINR(netRefundPaise)} recorded for ${tenantName}. Complete checkout settlement?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete Settlement',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await vacateTenantApi(tenantId, {
                deductionsPaise: deductionPaise,
                refundPaise: netRefundPaise,
                paymentMethod: 'cash',
                notes: 'Checkout settlement completed',
              });

              // Invalidate caches
              queryClient.invalidateQueries({ queryKey: ['matrix'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              queryClient.invalidateQueries({ queryKey: ['properties'] });

              Alert.alert(
                'Settlement Complete',
                `${tenantName} has been checked out. Bed is now marked available.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)/matrix'),
                  },
                ],
              );
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to complete checkout. Please try again.';
              Alert.alert('Checkout Error', msg);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const currentBedObj = tenant?.currentBed as { bedNumber?: string } | undefined;
  const bedLabel = currentBedObj?.bedNumber ? `Bed ${currentBedObj.bedNumber}` : 'PG Bed';

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      {/* Top Header */}
      <View className="px-4 py-2 flex-row items-center border-b border-slate-200/60 bg-[#F8F9FA]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <View className="ml-1 flex-1">
          <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
            Checkout Settlement
          </Text>
          <Text className="text-xs font-medium text-slate-500 mt-0.5">
            {tenant ? `${tenant.fullName} · ${bedLabel}` : 'Loading tenant...'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0A6C50" />
          <Text className="text-slate-500 font-medium text-sm mt-3">
            Loading settlement details…
          </Text>
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-rose-600 font-bold text-base mb-2">Error</Text>
          <Text className="text-slate-600 text-sm text-center mb-4">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-200 px-5 py-2.5 rounded-xl"
          >
            <Text className="font-bold text-slate-800 text-sm">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl p-5 border border-slate-200/80 mb-4 shadow-xs">
            <Text className="text-sm font-semibold text-slate-500 mb-1">Settlement Summary</Text>
            <Text className="text-xl font-extrabold text-slate-900 mb-4">
              {tenant?.fullName} · {bedLabel}
            </Text>

            <View className="border-b border-slate-100 pb-3 mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-slate-500">Security Deposit Paid</Text>
                <Text className="text-sm font-bold text-[#0A6C50]">+{formatINR(depositPaise)}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-slate-500">Unpaid Invoices</Text>
                <Text className="text-sm font-bold text-slate-700">
                  -{formatINR(unpaidInvoicesPaise)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Damage / Repair Deductions</Text>
                <Text className="text-sm font-bold text-rose-600">
                  -{formatINR(deductionPaise)}
                </Text>
              </View>
            </View>

            <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
              Damage / Repair Deductions (₹)
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-5 text-slate-900 bg-white shadow-xs text-base"
              placeholder="0"
              keyboardType="numeric"
              value={deductions}
              onChangeText={setDeductions}
            />

            <View className="bg-[#ECFDF5] border border-[#6EE7B7] p-4 rounded-xl flex-row justify-between items-center mb-6">
              <Text className="text-sm font-bold text-[#0A6C50]">Net Refundable Amount</Text>
              <Text className="text-xl font-extrabold text-[#0A6C50]">
                {formatINR(netRefundPaise)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              className="bg-[#0A6C50] rounded-xl py-4 items-center shadow-xs"
              onPress={handleConfirmVacate}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Confirm Vacate & Settle</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
