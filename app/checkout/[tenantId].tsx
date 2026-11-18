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
import { ConfirmActionModal } from '../../src/components/ConfirmDeleteModal';

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
      {/* Top Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -8,
          }}
        >
          <ChevronLeft size={26} color="#0C192B" />
        </TouchableOpacity>
        <View style={{ marginLeft: 4, flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.5 }}>
            Checkout Settlement
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
            {preview ? `${preview.tenant.fullName} · ${bedLabel}` : 'Loading tenant...'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F5330" />
          <Text style={{ color: '#657080', fontWeight: '500', fontSize: 14, marginTop: 12 }}>
            Loading settlement details…
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#BE123C', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
            Error
          </Text>
          <Text style={{ color: '#657080', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#E5DDCD',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontWeight: '700', color: '#0C192B', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : settlementResult ? (
        /* Settlement Complete Card */
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#F0FDF4',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={36} color="#4F5330" />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#0C192B',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Settlement Completed!
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#657080',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            Statement #{settlementResult.settlementNumber}
          </Text>

          <View
            style={{
              width: '100%',
              backgroundColor: '#FFFDF8',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
              }}
            >
              <Text style={{ fontSize: 14, color: '#657080' }}>Security Deposit</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#4F5330' }}>
                +{formatINR(settlementResult.depositPaidPaise)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
              }}
            >
              <Text style={{ fontSize: 14, color: '#657080' }}>Total Deductions</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C' }}>
                -{formatINR(settlementResult.totalDeductionsPaise)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                Net Refund Paid
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F5330' }}>
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
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.replace('/(tabs)/matrix')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
              Back to Bed Matrix
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#657080', marginBottom: 4 }}>
              Settlement Breakdown
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', marginBottom: 16 }}>
              {preview?.tenant.fullName} · {bedLabel}
            </Text>

            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
                paddingBottom: 12,
                marginBottom: 16,
              }}
            >
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ fontSize: 14, color: '#657080' }}>Security Deposit Paid</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4F5330' }}>
                  +{formatINR(depositPaise)}
                </Text>
              </View>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ fontSize: 14, color: '#657080' }}>Unpaid Invoices</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  -{formatINR(unpaidInvoicesPaise)}
                </Text>
              </View>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ fontSize: 14, color: '#657080' }}>Damage / Repair</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(damagePaise)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: '#657080' }}>Unbilled Electricity</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C' }}>
                  -{formatINR(electricityPaise)}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#0C192B',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Damage / Repair Deductions (₹)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 16,
                color: '#0C192B',
                backgroundColor: '#FAF5EB',
                fontSize: 16,
              }}
              placeholder="0"
              placeholderTextColor="#8C939D"
              keyboardType="numeric"
              value={damageDeductions}
              onChangeText={setDamageDeductions}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#0C192B',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Unbilled Electricity / EB Deductions (₹)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 16,
                color: '#0C192B',
                backgroundColor: '#FAF5EB',
                fontSize: 16,
              }}
              placeholder="0"
              placeholderTextColor="#8C939D"
              keyboardType="numeric"
              value={electricityDeductions}
              onChangeText={setElectricityDeductions}
            />

            {/* Payment Method Selector */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#0C192B',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Refund Payment Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['upi', 'cash', 'bank_transfer'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPaymentMode(mode)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: paymentMode === mode ? '#19D3E6' : '#FAF5EB',
                    borderColor: paymentMode === mode ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: paymentMode === mode ? '#0C192B' : '#657080',
                    }}
                  >
                    {mode === 'bank_transfer' ? 'Bank' : mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={{
                backgroundColor: '#F4F8EC',
                borderWidth: 1,
                borderColor: '#D9E8CE',
                padding: 16,
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#4F5330',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Net Refundable
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#4F5330', marginTop: 2 }}>
                  {formatINR(netRefundPaise)}
                </Text>
              </View>
              <FileCheck size={28} color="#4F5330" />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#4F5330',
                borderRadius: 9999,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={handleConfirmVacate}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                  Confirm Vacate & Settle
                </Text>
              )}
            </TouchableOpacity>
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
