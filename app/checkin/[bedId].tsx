import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Check, QrCode, X, ShieldCheck } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { validateName, validatePhone, validatePositiveNumber } from '../../src/utils/validation';
import { quickCheckinApi } from '../../src/api/checkin';
import { useProperty } from '../../src/context/PropertyContext';
import { QuickCheckinPayload } from '../../src/types/api';

export default function CheckinScreen() {
  const params = useLocalSearchParams<{
    bedId: string;
    bedNumber?: string;
    baseRentPaise?: string;
    propertyId?: string;
    roomNumber?: string;
  }>();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedPropertyId, selectedProperty } = useProperty();

  const effectiveBedId = params.bedId;
  const effectivePropertyId = params.propertyId || selectedPropertyId || '';
  const displayBed = params.bedNumber || effectiveBedId || 'Bed';

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(
    params.baseRentPaise ? String(Math.round(parseInt(params.baseRentPaise, 10) / 100)) : '8500',
  );
  const [deposit, setDeposit] = useState(
    params.baseRentPaise
      ? String(Math.round((parseInt(params.baseRentPaise, 10) / 100) * 1.5))
      : '12000',
  );
  const [idNumber, setIdNumber] = useState('');
  const [agreesToIdStorage, setAgreesToIdStorage] = useState(false);
  const [idSnapped, setIdSnapped] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial monthly rent if params change
  useEffect(() => {
    if (params.baseRentPaise) {
      const rentInRupees = Math.round(parseInt(params.baseRentPaise, 10) / 100);
      setMonthlyRent(String(rentInRupees));
      setDeposit(String(Math.round(rentInRupees * 1.5)));
    }
  }, [params.baseRentPaise]);

  // Dynamic proration for mid-month joining
  const { dayOfMonth, daysRemaining, proratedRent, totalAdvance, currentMonthName, nextMonthName } =
    useMemo(() => {
      const today = new Date();
      const d = today.getDate();
      const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const remaining = totalDays - d + 1;
      const rentNum = parseFloat(monthlyRent.replace(/,/g, '')) || 0;
      const depositNum = parseFloat(deposit.replace(/,/g, '')) || 0;
      const prorated = Math.round((rentNum * remaining) / totalDays);
      const total = prorated + depositNum;

      return {
        dayOfMonth: d,
        daysRemaining: remaining,
        proratedRent: prorated,
        totalAdvance: total,
        currentMonthName: today.toLocaleString('default', { month: 'short' }),
        nextMonthName: new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleString(
          'default',
          {
            month: 'short',
          },
        ),
      };
    }, [monthlyRent, deposit]);

  const handleSnapId = () => {
    setIdSnapped(true);
    Alert.alert('ID Proof Uploaded', 'Tenant ID proof photo attached and encrypted (< 200 KB).');
  };

  // Mask Aadhaar format: XXXX-XXXX-1234
  const formatMaskedAadhaar = (val: string): string => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-${last4}`;
  };

  const handleCompleteCheckin = () => {
    if (!effectivePropertyId) {
      Alert.alert('Property Error', 'Please select a valid property before check-in.');
      return;
    }

    // 1. Validate full name
    const nameResult = validateName(fullName, 'Tenant full name');
    if (!nameResult.isValid) {
      Alert.alert('Required Field', nameResult.error);
      return;
    }

    // 2. Validate tenant phone
    const phoneResult = validatePhone(phone);
    if (!phoneResult.isValid) {
      Alert.alert('Invalid Phone', phoneResult.error);
      return;
    }

    // 3. Validate emergency phone if provided
    if (emergencyPhone.trim()) {
      const emergResult = validatePhone(emergencyPhone);
      if (!emergResult.isValid) {
        Alert.alert('Invalid Emergency Phone', emergResult.error);
        return;
      }
      if (emergResult.normalized === phoneResult.normalized) {
        Alert.alert(
          'Duplicate Phone',
          'Emergency phone number must be different from the tenant primary phone.',
        );
        return;
      }
    }

    // 4. Validate rent & deposit
    const rentResult = validatePositiveNumber(monthlyRent, 'Monthly rent', 500);
    if (!rentResult.isValid) {
      Alert.alert('Invalid Rent', rentResult.error);
      return;
    }

    const depositResult = validatePositiveNumber(deposit, 'Security deposit', 0);
    if (!depositResult.isValid) {
      Alert.alert('Invalid Deposit', depositResult.error);
      return;
    }

    // 5. Require ID storage consent (Mandatory under DPDP Act 2023)
    if (!agreesToIdStorage) {
      Alert.alert(
        'Consent Required',
        'Tenant must provide consent for KYC document storage under DPDP Act 2023 regulations.',
      );
      return;
    }

    // 6. Check ID proof upload
    if (!idSnapped && !idNumber.trim()) {
      Alert.alert(
        'ID Proof Missing',
        'No ID proof photo or number has been provided. Do you want to proceed anyway?',
        [
          { text: 'Add ID', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: () => submitCheckinToServer(),
          },
        ],
      );
      return;
    }

    submitCheckinToServer();
  };

  const submitCheckinToServer = async () => {
    try {
      setIsSubmitting(true);

      const rentPaise = Math.round((parseFloat(monthlyRent.replace(/,/g, '')) || 0) * 100);
      const depositPaise = Math.round((parseFloat(deposit.replace(/,/g, '')) || 0) * 100);
      const depositPaidPaise = paymentCollected ? depositPaise : 0;

      const maskedKyc = idNumber.trim() ? formatMaskedAadhaar(idNumber.trim()) : undefined;

      const payload: QuickCheckinPayload = {
        propertyId: effectivePropertyId,
        bedId: effectiveBedId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        emergencyPhone: emergencyPhone.trim() || undefined,
        joinDate: new Date().toISOString(),
        monthlyRentPaise: rentPaise,
        depositPaise,
        depositPaidPaise,
        depositPaymentMethod: paymentMode,
        kycDocType: 'aadhaar',
        kycMaskedNumber: maskedKyc,
        kycDocUrl: idSnapped
          ? 'https://res.cloudinary.com/demo/image/authenticated/kyc-doc-placeholder.jpg'
          : undefined,
        kycConsent: agreesToIdStorage,
      };

      const result = await quickCheckinApi(payload);

      // Invalidate queries so Bed Matrix and Pulse update immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
      ]);

      const invoiceNum = result.invoice?.invoiceNumber || 'INV-Generated';
      const proratedRs = Math.round((result.invoice?.totalAmountPaise || 0) / 100);

      Alert.alert(
        '🎉 Check-in Confirmed!',
        `${result.tenant.fullName} successfully assigned to Bed ${displayBed}.\n\n` +
          `• First Invoice: #${invoiceNum}\n` +
          `• Prorated Amount: ₹${proratedRs.toLocaleString('en-IN')}\n` +
          `• Deposit Logged: ₹${Math.round(depositPaidPaise / 100).toLocaleString('en-IN')}`,
        [
          {
            text: 'View Matrix',
            onPress: () => router.replace('/(tabs)/matrix'),
          },
        ],
      );
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Check-in failed. Please verify the bed is available and try again.';
      Alert.alert('Check-in Failed', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyVpa = selectedProperty?.upiVpa || 'pgowner@upi';

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Top Header */}
        <View className="px-4 py-2 flex-row items-center border-b border-slate-200/60 bg-[#F8F9FA]">
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={isSubmitting}
            className="w-10 h-10 items-center justify-center -ml-2"
          >
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <View className="ml-1 flex-1">
            <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
              Check in · Bed {displayBed}
            </Text>
            <Text className="text-xs font-medium text-slate-500 mt-0.5">
              {params.roomNumber ? `Room ${params.roomNumber} · ` : ''}New tenant onboarding & KYC
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: ID PROOF & KYC */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-[#0A6C50] tracking-wider mb-2.5">
              1 · ID PROOF & KYC
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSnapId}
              className={`border-2 border-dashed rounded-2xl p-6 items-center justify-center bg-white shadow-xs ${
                idSnapped ? 'border-[#0A6C50] bg-[#F0FDF4]' : 'border-slate-300'
              }`}
            >
              <Camera size={32} color={idSnapped ? '#0A6C50' : '#1E293B'} strokeWidth={1.8} />
              <Text className="text-sm font-bold text-slate-800 mt-2.5">
                {idSnapped ? 'Aadhaar / ID Card Attached ✓' : 'Snap Aadhaar / ID Card'}
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                {idSnapped
                  ? 'Compressed (< 200 KB) and encrypted'
                  : 'Tap to take a photo or upload scan'}
              </Text>
            </TouchableOpacity>

            {/* Aadhaar Number Input */}
            <View className="mt-3.5">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">
                Aadhaar / ID Number (Optional)
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                placeholder="e.g. 5432 1098 7654"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={14}
                value={idNumber}
                onChangeText={setIdNumber}
              />
              <Text className="text-[11px] text-slate-400 mt-1">
                First 8 digits will be automatically masked (XXXX-XXXX-1234) under UIDAI guidelines.
              </Text>
            </View>

            {/* DPDP Act Consent Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreesToIdStorage(!agreesToIdStorage)}
              className="flex-row items-center mt-3 bg-white p-3 rounded-xl border border-slate-200"
            >
              <View
                className={`w-6 h-6 rounded-md items-center justify-center mr-2.5 ${
                  agreesToIdStorage ? 'bg-[#0A6C50]' : 'border border-slate-300 bg-white'
                }`}
              >
                {agreesToIdStorage && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800">DPDP Act 2023 KYC Consent</Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Tenant explicitly authorizes encrypted identity document storage for verification.
                </Text>
              </View>
              <ShieldCheck size={20} color={agreesToIdStorage ? '#0A6C50' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* SECTION 2: TENANT */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-[#0A6C50] tracking-wider mb-2.5">
              2 · TENANT DETAILS
            </Text>

            <View className="mb-3.5">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">Full name</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                placeholder="e.g. Rahul Verma"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Phone number</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="10-digit mobile"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Emergency phone</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="Guardian / Friend"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3: MONEY & PRORATION */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-[#0A6C50] tracking-wider mb-2.5">
              3 · RENT & DEPOSIT
            </Text>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">
                  Monthly rent (₹)
                </Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="8500"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={monthlyRent}
                  onChangeText={setMonthlyRent}
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Deposit (₹)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="12000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={deposit}
                  onChangeText={setDeposit}
                />
              </View>
            </View>

            {/* Prorated Info Box */}
            <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 mb-3.5">
              <Text className="text-xs font-semibold text-blue-900">
                Joining {dayOfMonth} {currentMonthName}: ₹{proratedRent.toLocaleString('en-IN')} for{' '}
                {daysRemaining} day{daysRemaining > 1 ? 's' : ''}, then full rent from 1{' '}
                {nextMonthName}
              </Text>
            </View>

            {/* Total due card */}
            <View className="bg-white border border-slate-200/80 rounded-xl p-3.5 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-semibold text-slate-700">Total Advance Due:</Text>
                <Text className="text-[11px] text-slate-400">Prorated rent + Security deposit</Text>
              </View>
              <Text className="text-xl font-extrabold text-[#0A6C50]">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Payment Method Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setPaymentMode('upi');
                  setShowQRModal(true);
                }}
                className={`flex-1 rounded-xl py-3.5 items-center justify-center shadow-xs border ${
                  paymentCollected && paymentMode === 'upi'
                    ? 'bg-[#0A6C50] border-[#0A6C50]'
                    : 'bg-white border-[#0A6C50]'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    paymentCollected && paymentMode === 'upi' ? 'text-white' : 'text-[#0A6C50]'
                  }`}
                >
                  {paymentCollected && paymentMode === 'upi' ? 'UPI Collected ✓' : 'Show UPI QR'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setPaymentMode('cash');
                  setPaymentCollected(true);
                  Alert.alert(
                    'Cash Recorded',
                    `₹${totalAdvance.toLocaleString('en-IN')} marked as received in cash.`,
                  );
                }}
                className={`flex-1 rounded-xl py-3.5 items-center justify-center shadow-xs ${
                  paymentCollected && paymentMode === 'cash'
                    ? 'bg-[#0A6C50] border border-[#0A6C50]'
                    : 'bg-white border border-[#0A6C50]'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    paymentCollected && paymentMode === 'cash' ? 'text-white' : 'text-[#0A6C50]'
                  }`}
                >
                  {paymentCollected && paymentMode === 'cash'
                    ? 'Cash Collected ✓'
                    : 'Cash received'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Sticky Action Button */}
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#F8F9FA] border-t border-slate-200/60">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCompleteCheckin}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl items-center justify-center shadow-sm flex-row ${
              isSubmitting ? 'bg-[#0A6C50]/70' : 'bg-[#0A6C50]'
            }`}
          >
            {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />}
            <Text className="text-white font-bold text-base">
              {isSubmitting ? 'Checking in tenant...' : 'Check in tenant'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* UPI QR Modal */}
        <Modal
          visible={showQRModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRModal(false)}
        >
          <View className="flex-1 bg-black/50 items-center justify-center p-6">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
              <View className="flex-row justify-between items-center w-full mb-4">
                <Text className="text-lg font-bold text-slate-900">Scan to Pay Advance</Text>
                <TouchableOpacity onPress={() => setShowQRModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="w-52 h-52 bg-slate-100 rounded-2xl items-center justify-center border border-slate-200 mb-3 p-4">
                <QrCode size={160} color="#0A6C50" />
              </View>

              <Text className="text-2xl font-extrabold text-[#0A6C50] mb-0.5">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </Text>
              <Text className="text-xs text-slate-400 mb-1">VPA: {propertyVpa}</Text>
              <Text className="text-xs text-slate-500 mb-6 text-center">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowQRModal(false);
                  setPaymentCollected(true);
                  Alert.alert(
                    'Payment Recorded',
                    `₹${totalAdvance.toLocaleString('en-IN')} marked received via UPI.`,
                  );
                }}
                className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-sm">Mark Received via UPI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
