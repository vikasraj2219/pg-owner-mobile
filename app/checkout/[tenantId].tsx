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
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Wallet,
  AlertTriangle,
  User,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../../src/utils/currency';
import { formatSafeDate } from '../../src/utils/date';
import { getCheckoutPreviewApi, confirmCheckoutApi } from '../../src/api/checkout';
import { CheckoutPreviewData, ISettlementStatement } from '../../src/types/api';
import { ConfirmActionModal } from '../../src/components/ConfirmDeleteModal';
import { DecorativeWaveFooter } from '../../src/components/DecorativeWaveFooter';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    setShowConfirmModal(true);
  };

  const executeConfirmVacate = async () => {
    if (!tenantId) return;
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

      setShowConfirmModal(false);
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
  };

  const bedLabel = preview?.tenant.currentBed?.bedNumber
    ? `Bed ${preview.tenant.currentBed.bedNumber}`
    : 'PG Bed';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF5EB' }} edges={['top']}>
      {/* Top Header matching Add Room / Tenant Details design */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}>
            Checkout Settlement
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
            {preview ? `${preview.tenant.fullName} · ${bedLabel}` : 'Calculate deposit refund'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F5330" />
          <Text style={{ color: '#657080', fontWeight: '600', fontSize: 13, marginTop: 12 }}>
            Loading settlement details…
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: '#FEF2F2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={28} color="#BE123C" />
          </View>
          <Text style={{ color: '#BE123C', fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
            Unable to Load Checkout
          </Text>
          <Text
            style={{
              color: '#657080',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 18,
              lineHeight: 20,
            }}
          >
            {errorMessage}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{
              backgroundColor: '#4F5330',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 9999,
            }}
          >
            <Text style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : settlementResult ? (
        /* Settlement Completed Screen matching Receipt design */
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FAF5EB' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Green checkmark header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#22C55E',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
                shadowColor: '#22C55E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <CheckCircle2 size={34} color="#FFFFFF" strokeWidth={2.5} />
            </View>

            <Text
              style={{
                fontSize: 22,
                fontWeight: '900',
                color: '#0C192B',
                letterSpacing: -0.5,
              }}
            >
              Settlement Completed!
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080', marginTop: 4 }}>
              Tenant has been checked out and bed marked vacant
            </Text>
          </View>

          {/* Statement Card */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              padding: 20,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Header info */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
                marginBottom: 14,
              }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                  {preview?.tenant.fullName}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  {bedLabel}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#E8F5E9',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9999,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>Vacated</Text>
              </View>
            </View>

            {/* Statement lines */}
            <View style={{ gap: 10, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080' }}>Statement No.</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                  #{settlementResult.settlementNumber}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080' }}>Settlement Date</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                  {formatSafeDate(settlementResult.checkoutDate || new Date())}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080' }}>Refund Mode</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#0C192B',
                    textTransform: 'uppercase',
                  }}
                >
                  {paymentMode}
                </Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: '#F0ECE1',
                  marginVertical: 4,
                }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080' }}>Security Deposit Held</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                  +{formatINR(settlementResult.depositPaidPaise)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080' }}>Total Deductions</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(settlementResult.totalDeductionsPaise)}
                </Text>
              </View>
            </View>

            {/* Highlighted Net Refund Card */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                  NET REFUND ISSUED
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  Paid via {paymentMode.toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#15803D' }}>
                {formatINR(settlementResult.netRefundPaise)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              width: '100%',
              backgroundColor: '#4F5330',
              borderRadius: 9999,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => router.replace('/(tabs)/matrix')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
              Back to Bed Matrix
            </Text>
          </TouchableOpacity>

          <DecorativeWaveFooter
            height={48}
            style={{ marginTop: 16, marginHorizontal: -20, marginBottom: -36 }}
          />
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FAF5EB' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Tenant Card matching Add Room / Tenant details */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 20,
              padding: 16,
              marginBottom: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FAF7F0',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <User size={22} color="#4F5330" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                {preview?.tenant.fullName}
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                numberOfLines={1}
              >
                {bedLabel} · {preview?.tenant.phone || ''}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderWidth: 1,
                borderColor: '#FDE68A',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                Checkout Pending
              </Text>
            </View>
          </View>

          {/* 3 Metric Summary Cards matching Tenant Details */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {/* Card 1: Deposit Held */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#F0F6FF',
                borderWidth: 1,
                borderColor: '#DCE8FA',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Wallet size={15} color="#0284C7" strokeWidth={2.4} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#1E293B',
                    marginLeft: 6,
                  }}
                  numberOfLines={1}
                >
                  Deposit Held
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#0C192B',
                  letterSpacing: -0.3,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {formatINR(depositPaise)}
              </Text>
            </View>

            {/* Card 2: Unpaid Dues */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <AlertTriangle size={15} color="#DC2626" strokeWidth={2.4} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#1E293B',
                    marginLeft: 6,
                  }}
                  numberOfLines={1}
                >
                  Unpaid Dues
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#DC2626',
                  letterSpacing: -0.3,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {formatINR(unpaidInvoicesPaise)}
              </Text>
            </View>

            {/* Card 3: Estimated Refund */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#DCFCE7',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Calendar size={15} color="#15803D" strokeWidth={2.4} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#1E293B',
                    marginLeft: 6,
                  }}
                  numberOfLines={1}
                >
                  Est. Refund
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color:
                    (preview?.estimatedRefundPaise || netRefundPaise) > 0 ? '#15803D' : '#0C192B',
                  letterSpacing: -0.3,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {formatINR(preview?.estimatedRefundPaise || netRefundPaise)}
              </Text>
            </View>
          </View>

          {/* Deductions & Settlement Form Card */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              padding: 18,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 14,
              }}
            >
              Settlement Deductions
            </Text>

            {/* Breakdown lines */}
            <View
              style={{
                backgroundColor: '#FAF7F0',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                padding: 14,
                marginBottom: 16,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080', fontWeight: '500' }}>
                  Security Deposit Paid
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                  +{formatINR(depositPaise)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080', fontWeight: '500' }}>
                  Unpaid Invoices / Rent
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(unpaidInvoicesPaise)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080', fontWeight: '500' }}>
                  Damage & Repair
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(damagePaise)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#657080', fontWeight: '500' }}>
                  Unbilled Electricity / EB
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(electricityPaise)}
                </Text>
              </View>
            </View>

            {/* Damage / Repair Deductions Input */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 6,
                }}
              >
                Damage / Repair Deductions (₹)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FAF5EB',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#657080', marginRight: 4 }}>
                  ₹
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#0C192B',
                  }}
                  placeholder="0"
                  placeholderTextColor="#8C939D"
                  keyboardType="numeric"
                  value={damageDeductions}
                  onChangeText={setDamageDeductions}
                />
              </View>
            </View>

            {/* Unbilled Electricity Deductions Input */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#0C192B',
                  marginBottom: 6,
                }}
              >
                Unbilled Electricity / EB Deductions (₹)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FAF5EB',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#657080', marginRight: 4 }}>
                  ₹
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#0C192B',
                  }}
                  placeholder="0"
                  placeholderTextColor="#8C939D"
                  keyboardType="numeric"
                  value={electricityDeductions}
                  onChangeText={setElectricityDeductions}
                />
              </View>
            </View>

            {/* Refund Payment Mode Selector */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              Refund Payment Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {(['upi', 'cash', 'bank_transfer'] as const).map(mode => {
                const isSelected = paymentMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    activeOpacity={0.7}
                    onPress={() => setPaymentMode(mode)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: isSelected ? '#0C192B' : '#657080',
                      }}
                    >
                      {mode === 'bank_transfer' ? 'Bank' : mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Net Refund Highlighted Card matching Receipt */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                padding: 16,
                borderRadius: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#15803D',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Net Refund to Tenant
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  Deposit minus all deductions
                </Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#15803D' }}>
                {formatINR(netRefundPaise)}
              </Text>
            </View>

            {/* Confirm Settlement Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#4F5330',
                borderRadius: 9999,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={handleConfirmVacate}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  Confirm Vacate & Settle
                </Text>
              )}
            </TouchableOpacity>

            <DecorativeWaveFooter
              height={48}
              style={{ marginTop: 20, marginHorizontal: -20, marginBottom: -40 }}
            />
          </View>
        </ScrollView>
      )}

      {/* Vacate & Settlement Confirmation Modal */}
      <ConfirmActionModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeConfirmVacate}
        isLoading={isSubmitting}
        variant="primary"
        title="Confirm Vacate & Settlement"
        message={`Net refund of ${formatINR(netRefundPaise)} will be issued via ${paymentMode.toUpperCase()} for ${preview?.tenant.fullName || 'Tenant'}. Complete checkout?`}
        confirmLabel="Confirm Settlement"
      />
    </SafeAreaView>
  );
}
