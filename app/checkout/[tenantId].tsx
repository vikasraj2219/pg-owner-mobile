import React, { useState, useEffect } from 'react';
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
import { ChevronLeft, FileCheck, CheckCircle2 } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../../src/utils/currency';
import { getCheckoutPreviewApi, confirmCheckoutApi } from '../../src/api/checkout';
import { CheckoutPreviewData, ISettlementStatement } from '../../src/types/api';

export default function CheckoutScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [preview, setPreview] = useState<CheckoutPreviewData | null>(null);
  const [damageDeductions, setDamageDeductions] = useState('0');
  const [electricityDeductions, setElectricityDeductions] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer'>('upi');
  const [settlementResult, setSettlementResult] = useState<ISettlementStatement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTenantData() {
      if (!tenantId) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getCheckoutPreviewApi(tenantId);
        if (isMounted) {
          setPreview(data);
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

  const depositPaise = preview?.depositPaidPaise || 0;
  const unpaidInvoicesPaise = preview?.unpaidDuesPaise || 0;

  const damageNum = Math.max(0, parseFloat(damageDeductions.replace(/,/g, '')) || 0);
  const damagePaise = Math.round(damageNum * 100);

  const electricityNum = Math.max(0, parseFloat(electricityDeductions.replace(/,/g, '')) || 0);
  const electricityPaise = Math.round(electricityNum * 100);

  const totalDeductionsPaise = unpaidInvoicesPaise + damagePaise + electricityPaise;
  const netRefundPaise = Math.max(0, depositPaise - totalDeductionsPaise);

  const handleConfirmVacate = () => {
    if (!tenantId) return;

    const tenantName = preview?.tenant.fullName || 'Tenant';

    Alert.alert(
      'Confirm Vacate & Settlement',
      `Net refund of ${formatINR(netRefundPaise)} will be issued via ${paymentMode.toUpperCase()} for ${tenantName}. Complete checkout?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Settlement',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const res = await confirmCheckoutApi({
                tenantId,
                damageDeductionsPaise: damagePaise,
                electricityDeductionsPaise: electricityPaise,
                refundPaise: netRefundPaise,
                paymentMethod: paymentMode,
                notes: 'Guarded checkout settlement completed',
              });

              setSettlementResult(res.settlement);

              // Invalidate caches
              queryClient.invalidateQueries({ queryKey: ['tenants'] });
              queryClient.invalidateQueries({ queryKey: ['matrix'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              queryClient.invalidateQueries({ queryKey: ['properties'] });
              queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
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

  const bedLabel = preview?.tenant.currentBed?.bedNumber
    ? `Bed ${preview.tenant.currentBed.bedNumber}`
    : 'PG Bed';

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
            {preview ? `${preview.tenant.fullName} · ${bedLabel}` : 'Loading tenant...'}
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
      ) : settlementResult ? (
        /* Settlement Complete Card */
        <View className="flex-1 p-6 justify-center items-center">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <CheckCircle2 size={36} color="#0A6C50" />
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center mb-1">
            Settlement Completed!
          </Text>
          <Text className="text-sm font-semibold text-slate-500 text-center mb-6">
            Statement #{settlementResult.settlementNumber}
          </Text>

          <View className="w-full bg-white rounded-2xl p-5 border border-slate-200/80 mb-6 shadow-xs">
            <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-100">
              <Text className="text-sm text-slate-500">Security Deposit</Text>
              <Text className="text-sm font-bold text-[#0A6C50]">
                +{formatINR(settlementResult.depositPaidPaise)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-100">
              <Text className="text-sm text-slate-500">Total Deductions</Text>
              <Text className="text-sm font-bold text-rose-600">
                -{formatINR(settlementResult.totalDeductionsPaise)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-1">
              <Text className="text-base font-extrabold text-slate-900">Net Refund Paid</Text>
              <Text className="text-lg font-black text-[#0A6C50]">
                {formatINR(settlementResult.netRefundPaise)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            className="w-full bg-[#0A6C50] rounded-2xl py-4 items-center justify-center shadow-xs"
            onPress={() => router.replace('/(tabs)/matrix')}
          >
            <Text className="text-white font-extrabold text-base">Back to Bed Matrix</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl p-5 border border-slate-200/80 mb-4 shadow-xs">
            <Text className="text-sm font-semibold text-slate-500 mb-1">Settlement Breakdown</Text>
            <Text className="text-xl font-extrabold text-slate-900 mb-4">
              {preview?.tenant.fullName} · {bedLabel}
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
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-slate-500">Damage / Repair</Text>
                <Text className="text-sm font-bold text-rose-600">-{formatINR(damagePaise)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Unbilled Electricity</Text>
                <Text className="text-sm font-bold text-rose-600">
                  -{formatINR(electricityPaise)}
                </Text>
              </View>
            </View>

            <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
              Damage / Repair Deductions (₹)
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-base"
              placeholder="0"
              keyboardType="numeric"
              value={damageDeductions}
              onChangeText={setDamageDeductions}
            />

            <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
              Unbilled Electricity / EB Deductions (₹)
            </Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-base"
              placeholder="0"
              keyboardType="numeric"
              value={electricityDeductions}
              onChangeText={setElectricityDeductions}
            />

            {/* Payment Method Selector */}
            <Text className="text-xs font-bold text-slate-700 uppercase mb-2">
              Refund Payment Mode
            </Text>
            <View className="flex-row gap-2 mb-5">
              {(['upi', 'cash', 'bank_transfer'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPaymentMode(mode)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    paymentMode === mode
                      ? 'bg-[#E6F4EA] border-[#0A6C50]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase ${
                      paymentMode === mode ? 'text-[#0A6C50]' : 'text-slate-600'
                    }`}
                  >
                    {mode === 'bank_transfer' ? 'Bank' : mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-[#ECFDF5] border border-[#6EE7B7] p-4 rounded-xl flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xs font-bold text-[#0A6C50] uppercase tracking-wider">
                  Net Refundable
                </Text>
                <Text className="text-2xl font-black text-[#0A6C50]">
                  {formatINR(netRefundPaise)}
                </Text>
              </View>
              <FileCheck size={28} color="#0A6C50" />
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
