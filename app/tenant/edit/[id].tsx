import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Repeat, Info, BedDouble, X } from 'lucide-react-native';
import { useTenantDetail } from '../../../src/hooks/useTenants';
import { useMatrix } from '../../../src/hooks/useMatrix';
import { updateTenantApi, moveBedApi } from '../../../src/api/tenants';
import { formatINR } from '../../../src/utils/currency';
import { formatSafeDate } from '../../../src/utils/date';
import { IMatrixBed, IMatrixRoom } from '../../../src/types/api';

export default function EditTenantScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { tenant, isLoading, refetch } = useTenantDetail(id);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rentRupees, setRentRupees] = useState('');
  const [depositRupees, setDepositRupees] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Move bed modal state
  const [isMoveBedModalVisible, setIsMoveBedModalVisible] = useState(false);
  const [isMovingBed, setIsMovingBed] = useState(false);

  // Load property matrix for available vacant beds
  const propertyId = typeof tenant?.property === 'object' ? tenant.property?._id : tenant?.property;
  const { data: matrixData } = useMatrix(propertyId || null);

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setFullName(tenant.fullName || '');
      setPhone(tenant.phone || '');
      setEmergencyPhone(tenant.emergencyPhone || '');
      setEmail(tenant.email || '');
      setRentRupees(tenant.monthlyRentPaise ? String(tenant.monthlyRentPaise / 100) : '');
      setDepositRupees(tenant.depositPaise ? String(tenant.depositPaise / 100) : '');
    }
  }, [tenant]);

  const currentBedNumber = useMemo(() => {
    if (!tenant?.currentBed || typeof tenant.currentBed !== 'object') return 'N/A';
    return tenant.currentBed.bedNumber || 'N/A';
  }, [tenant]);

  const originalRentRupees = useMemo(() => {
    return tenant?.monthlyRentPaise ? tenant.monthlyRentPaise / 100 : 0;
  }, [tenant]);

  // Extract vacant beds for bed move
  const vacantBedsList = useMemo(() => {
    const list: Array<{ bed: IMatrixBed; room: IMatrixRoom }> = [];
    if (!matrixData?.floors) return list;
    matrixData.floors.forEach(f => {
      (f.rooms || []).forEach(r => {
        (r.beds || []).forEach(b => {
          if (b.status === 'available') {
            list.push({ bed: b, room: r });
          }
        });
      });
    });
    return list;
  }, [matrixData]);

  const handleSave = async () => {
    if (!tenant) return;
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter tenant full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter tenant phone number.');
      return;
    }

    const rentPaise = Math.round((parseFloat(rentRupees) || 0) * 100);
    const depositPaise = Math.round((parseFloat(depositRupees) || 0) * 100);

    setIsSaving(true);
    try {
      await updateTenantApi(tenant._id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        emergencyPhone: emergencyPhone.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        monthlyRentPaise: rentPaise,
        depositPaise: depositPaise,
      });

      Alert.alert('Success', 'Tenant details updated successfully.');
      void refetch();
      router.back();
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || err.message || 'Could not update.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectNewBed = async (newBedId: string, bedNumber: string) => {
    if (!tenant) return;
    setIsMovingBed(true);
    try {
      await moveBedApi(tenant._id, {
        newBedId,
        notes: `Bed transfer from ${currentBedNumber} to ${bedNumber}`,
      });
      setIsMoveBedModalVisible(false);
      Alert.alert('Bed Reallocated', `${tenant.fullName} has been moved to Bed ${bedNumber}.`);
      void refetch();
    } catch (err: any) {
      Alert.alert('Transfer Failed', err?.response?.data?.message || err.message);
    } finally {
      setIsMovingBed(false);
    }
  };

  if (isLoading || !tenant) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0B6645" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="p-1 -ml-2 mr-2"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-black text-slate-900">Edit tenant</Text>
          <Text className="text-xs font-semibold text-slate-500">
            {tenant.fullName} · Bed {currentBedNumber}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Full Name */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 mb-1.5">Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Rahul Verma"
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900"
          />
        </View>

        {/* Phone & Emergency Phone in Two Columns */}
        <View className="flex-row space-x-3 mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-xs font-bold text-slate-700 mb-1.5">Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900"
            />
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-xs font-bold text-slate-700 mb-1.5">Emergency phone</Text>
            <TextInput
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
              placeholder="98480 11223"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900"
            />
          </View>
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 mb-1.5">Email (optional)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="rahul.verma@mail.com"
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900"
          />
        </View>

        {/* Monthly Rent & Deposit in Two Columns */}
        <View className="flex-row space-x-3 mb-1">
          <View className="flex-1 mr-2">
            <Text className="text-xs font-bold text-slate-700 mb-1.5">Monthly rent (₹)</Text>
            <TextInput
              value={rentRupees}
              onChangeText={setRentRupees}
              keyboardType="numeric"
              placeholder="8500"
              className="bg-slate-50 border border-[#0B6645] rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900"
            />
            {Number(rentRupees) !== originalRentRupees && originalRentRupees > 0 && (
              <Text className="text-xs font-bold text-[#0B6645] mt-1 ml-1">
                Was {formatINR(originalRentRupees * 100)}
              </Text>
            )}
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-xs font-bold text-slate-700 mb-1.5">Deposit (₹)</Text>
            <TextInput
              value={depositRupees}
              onChangeText={setDepositRupees}
              keyboardType="numeric"
              placeholder="17000"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900"
            />
          </View>
        </View>

        {/* Joining Date */}
        <View className="mb-5 mt-3">
          <Text className="text-xs font-bold text-slate-700 mb-1.5">Joining date</Text>
          <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
            <Text className="text-sm font-semibold text-slate-800">
              {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
            </Text>
          </View>
        </View>

        {/* Move to another bed Row */}
        <TouchableOpacity
          onPress={() => setIsMoveBedModalVisible(true)}
          activeOpacity={0.7}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between mb-5 shadow-sm"
        >
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3">
              <Repeat size={18} color="#0B6645" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">Move to another bed</Text>
              <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                Currently {currentBedNumber}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Rent Changes Notice Alert Callout */}
        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex-row items-start mb-6">
          <Info size={18} color="#2563EB" style={{ marginTop: 2, marginRight: 10 }} />
          <Text className="text-xs text-[#1E40AF] font-medium leading-relaxed flex-1">
            Rent changes apply from the next invoice (Nov). Past invoices stay as they are.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-5 shadow-xl elevation-10">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className="w-full bg-[#0B6645] py-3.5 rounded-full items-center justify-center mb-2.5 shadow-sm"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-black text-sm">Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="w-full py-2 items-center justify-center"
        >
          <Text className="text-slate-600 font-bold text-sm">Discard changes</Text>
        </TouchableOpacity>
      </View>

      {/* Move Bed Picker Modal */}
      <Modal
        visible={isMoveBedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMoveBedModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <View>
                <Text className="text-lg font-black text-slate-900">Select Vacant Bed</Text>
                <Text className="text-xs text-slate-500 font-medium">
                  Transfer {tenant.fullName} from Bed {currentBedNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMoveBedModalVisible(false)} className="p-1">
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isMovingBed ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#0B6645" />
                <Text className="text-xs font-bold text-slate-500 mt-2">Transferring bed...</Text>
              </View>
            ) : vacantBedsList.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <BedDouble size={40} color="#CBD5E1" />
                <Text className="text-sm font-bold text-slate-700 mt-2">
                  No other vacant beds available
                </Text>
              </View>
            ) : (
              <ScrollView className="divide-y divide-slate-100">
                {vacantBedsList.map(({ bed, room }) => (
                  <TouchableOpacity
                    key={bed._id}
                    onPress={() => handleSelectNewBed(bed._id, bed.bedNumber)}
                    className="py-3.5 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-base font-black text-slate-900">
                        Bed {bed.bedNumber}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-500">
                        Room {room.roomNumber} · Floor {room.floorNumber}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-black text-[#0B6645]">
                        {formatINR(room.baseRentPaisePerBed || 0)}
                      </Text>
                      <Text className="text-[11px] font-bold text-slate-400">Tap to move</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
