import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Check, QrCode, X } from 'lucide-react-native';
import { validateName, validatePhone, validatePositiveNumber } from '../../src/utils/validation';

export default function CheckinScreen() {
  const { bedId } = useLocalSearchParams<{ bedId: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('8500');
  const [deposit, setDeposit] = useState('12000');
  const [agreesToIdStorage, setAgreesToIdStorage] = useState(false);
  const [idSnapped, setIdSnapped] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);

  const displayBed = bedId || '201-A';

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
    Alert.alert('ID Proof Uploaded', 'Tenant ID proof captured and saved successfully.');
  };

  const handleCompleteCheckin = () => {
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

    // 5. Require ID storage consent
    if (!agreesToIdStorage) {
      Alert.alert(
        'Consent Required',
        'Tenant must give consent to ID proof storage according to DPDP regulations.',
      );
      return;
    }

    // 6. Check ID proof upload
    if (!idSnapped) {
      Alert.alert(
        'ID Proof Missing',
        'No ID proof has been captured yet. Do you want to proceed without an ID proof photo?',
        [
          { text: 'Capture ID', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: () => confirmCheckin(),
          },
        ],
      );
      return;
    }

    confirmCheckin();
  };

  const confirmCheckin = () => {
    Alert.alert(
      'Check-in Confirmed!',
      `${fullName.trim()} successfully checked into Bed ${displayBed}.\n\nTotal advance due: ₹${totalAdvance.toLocaleString('en-IN')}.\nWelcome WhatsApp and digital invoice sent.`,
      [
        {
          text: 'Go to Matrix',
          onPress: () => router.replace('/(tabs)/matrix'),
        },
      ],
    );
  };

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
            className="w-10 h-10 items-center justify-center -ml-2"
          >
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <View className="ml-1 flex-1">
            <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
              Check in · Bed {displayBed}
            </Text>
            <Text className="text-xs font-medium text-slate-500 mt-0.5">
              New tenant onboarding & KYC
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: ID PROOF */}
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
                  ? 'Compressed (< 200 KB) and ready'
                  : 'Tap to take a photo or upload scan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgreesToIdStorage(!agreesToIdStorage)}
              className="flex-row items-center mt-3"
            >
              <View
                className={`w-6 h-6 rounded-md items-center justify-center mr-2.5 ${
                  agreesToIdStorage ? 'bg-[#0A6C50]' : 'border border-slate-300 bg-white'
                }`}
              >
                {agreesToIdStorage && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text className="text-sm font-medium text-slate-800 flex-1">
                Tenant agrees to encrypted ID storage (DPDP Act compliant)
              </Text>
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
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3: MONEY */}
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
              <Text className="text-sm font-semibold text-slate-700">Total Advance Due:</Text>
              <Text className="text-lg font-extrabold text-[#0A6C50]">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Outline Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowQRModal(true)}
                className="flex-1 bg-white border border-[#0A6C50] rounded-xl py-3.5 items-center justify-center shadow-xs"
              >
                <Text className="text-[#0A6C50] font-bold text-sm">Show UPI QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setCashCollected(true);
                  Alert.alert(
                    'Cash Received',
                    `₹${totalAdvance.toLocaleString('en-IN')} marked collected in cash.`,
                  );
                }}
                className={`flex-1 rounded-xl py-3.5 items-center justify-center shadow-xs ${
                  cashCollected
                    ? 'bg-[#0A6C50] border border-[#0A6C50]'
                    : 'bg-white border border-[#0A6C50]'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${cashCollected ? 'text-white' : 'text-[#0A6C50]'}`}
                >
                  {cashCollected ? 'Cash Collected ✓' : 'Cash received'}
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
            className="w-full bg-[#0A6C50] py-4 rounded-xl items-center justify-center shadow-sm"
          >
            <Text className="text-white font-bold text-base">Check in tenant</Text>
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
                <Text className="text-lg font-bold text-slate-900">Scan to Pay Deposit & Rent</Text>
                <TouchableOpacity onPress={() => setShowQRModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="w-52 h-52 bg-slate-100 rounded-2xl items-center justify-center border border-slate-200 mb-4 p-4">
                <QrCode size={160} color="#0A6C50" />
              </View>

              <Text className="text-2xl font-extrabold text-[#0A6C50] mb-1">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </Text>
              <Text className="text-xs text-slate-500 mb-6 text-center">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowQRModal(false);
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
