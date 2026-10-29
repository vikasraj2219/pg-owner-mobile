import React, { useState } from 'react';
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

export default function CheckinScreen() {
  const { bedId } = useLocalSearchParams<{ bedId: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState('Rahul Verma');
  const [phone, setPhone] = useState('98765 43210');
  const [emergencyPhone, setEmergencyPhone] = useState('98480 11223');
  const [monthlyRent, setMonthlyRent] = useState('8,500');
  const [deposit, setDeposit] = useState('12,000');
  const [agreesToIdStorage, setAgreesToIdStorage] = useState(true);
  const [idSnapped, setIdSnapped] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);

  const displayBed = bedId || '201-A';

  const handleSnapId = () => {
    setIdSnapped(true);
    Alert.alert('ID Proof Uploaded', 'Aadhaar card scan captured and compressed (142 KB).');
  };

  const handleCompleteCheckin = () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please enter tenant name and phone number.');
      return;
    }

    Alert.alert(
      'Check-in Confirmed!',
      `${fullName} checked into Bed ${displayBed}.\n\nWelcome WhatsApp and digital invoice sent.`,
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
              Floor 2 · Triple sharing · Step 1 of 3
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
              1 · ID PROOF
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
                {idSnapped ? 'Aadhaar / ID Card Attached ✓' : 'Snap Aadhaar / ID'}
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
              <Text className="text-sm font-medium text-slate-800">
                Tenant agrees to ID storage
              </Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 2: TENANT */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-[#0A6C50] tracking-wider mb-2.5">
              2 · TENANT
            </Text>

            <View className="mb-3.5">
              <Text className="text-sm font-semibold text-slate-700 mb-1.5">Full name</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                placeholder="Rahul Verma"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Phone</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Emergency phone</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="98480 11223"
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
              3 · MONEY
            </Text>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">
                  Monthly rent (₹)
                </Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="8,500"
                  keyboardType="numeric"
                  value={monthlyRent}
                  onChangeText={setMonthlyRent}
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-1.5">Deposit (₹)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 shadow-xs"
                  placeholder="12,000"
                  keyboardType="numeric"
                  value={deposit}
                  onChangeText={setDeposit}
                />
              </View>
            </View>

            {/* Prorated Info Box */}
            <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 mb-3.5">
              <Text className="text-xs font-semibold text-blue-900">
                Joining 29 Oct: ₹823 for 3 days, then full rent from 1 Nov
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
                  Alert.alert('Cash Received', '₹12,823 marked collected in cash.');
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
                <Text className="text-lg font-bold text-slate-900">Scan to Pay Deposit</Text>
                <TouchableOpacity onPress={() => setShowQRModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="w-52 h-52 bg-slate-100 rounded-2xl items-center justify-center border border-slate-200 mb-4 p-4">
                <QrCode size={160} color="#0A6C50" />
              </View>

              <Text className="text-xl font-extrabold text-slate-900 mb-1">₹12,823</Text>
              <Text className="text-xs text-slate-500 mb-6">
                UPI ID: srisaipg@okaxis · Sri Sai Boys PG
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowQRModal(false);
                  Alert.alert('Payment Received', '₹12,823 received via UPI.');
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
