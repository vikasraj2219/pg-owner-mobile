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
      <SafeAreaView
        edges={['top']}
        style={{
          flex: 1,
          backgroundColor: '#FAF5EB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#4F5330" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 4, marginLeft: -8, marginRight: 8 }}
        >
          <ChevronLeft size={24} color="#0C192B" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B' }}>Edit tenant</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 1 }}>
            {tenant.fullName} · Bed {currentBedNumber}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 }}
      >
        {/* Full Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Full name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Rahul Verma"
            placeholderTextColor="#8C939D"
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 14,
              fontWeight: '600',
              color: '#0C192B',
            }}
          />
        </View>

        {/* Phone & Emergency Phone in Two Columns */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Phone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor="#8C939D"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                fontWeight: '600',
                color: '#0C192B',
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Emergency phone
            </Text>
            <TextInput
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
              placeholder="98480 11223"
              placeholderTextColor="#8C939D"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                fontWeight: '600',
                color: '#0C192B',
              }}
            />
          </View>
        </View>

        {/* Email */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Email (optional)
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="rahul.verma@mail.com"
            placeholderTextColor="#8C939D"
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 14,
              fontWeight: '600',
              color: '#0C192B',
            }}
          />
        </View>

        {/* Monthly Rent & Deposit in Two Columns */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Monthly rent (₹)
            </Text>
            <TextInput
              value={rentRupees}
              onChangeText={setRentRupees}
              keyboardType="numeric"
              placeholder="8500"
              placeholderTextColor="#8C939D"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#4F5330',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                fontWeight: '700',
                color: '#0C192B',
              }}
            />
            {Number(rentRupees) !== originalRentRupees && originalRentRupees > 0 && (
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: '#4F5330',
                  marginTop: 4,
                  marginLeft: 4,
                }}
              >
                Was {formatINR(originalRentRupees * 100)}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Deposit (₹)
            </Text>
            <TextInput
              value={depositRupees}
              onChangeText={setDepositRupees}
              keyboardType="numeric"
              placeholder="17000"
              placeholderTextColor="#8C939D"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                fontWeight: '700',
                color: '#0C192B',
              }}
            />
          </View>
        </View>

        {/* Joining Date */}
        <View style={{ marginBottom: 20, marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Joining date
          </Text>
          <View
            style={{
              backgroundColor: '#FAF5EB',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0C192B' }}>
              {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
            </Text>
          </View>
        </View>

        {/* Move to another bed Row */}
        <TouchableOpacity
          onPress={() => setIsMoveBedModalVisible(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#D1F4F9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Repeat size={18} color="#0799AA" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                Move to another bed
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                Currently {currentBedNumber}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#657080" />
        </TouchableOpacity>

        {/* Rent Changes Notice Alert Callout */}
        <View
          style={{
            backgroundColor: '#F4F8EC',
            borderWidth: 1,
            borderColor: '#D9E8CE',
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <Info size={18} color="#4F5330" style={{ marginTop: 2, marginRight: 10 }} />
          <Text
            style={{ fontSize: 12, color: '#4F5330', fontWeight: '500', lineHeight: 18, flex: 1 }}
          >
            Rent changes apply from the next invoice. Past invoices stay as they are.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFDF8',
          borderTopWidth: 1,
          borderTopColor: '#E5DDCD',
          padding: 16,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            backgroundColor: '#4F5330',
            paddingVertical: 14,
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: '100%',
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#657080', fontWeight: '700', fontSize: 13 }}>Discard changes</Text>
        </TouchableOpacity>
      </View>

      {/* Move Bed Picker Modal */}
      <Modal
        visible={isMoveBedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMoveBedModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '80%',
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                  Select Vacant Bed
                </Text>
                <Text style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginTop: 2 }}>
                  Transfer {tenant.fullName} from Bed {currentBedNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMoveBedModalVisible(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color="#657080" />
              </TouchableOpacity>
            </View>

            {isMovingBed ? (
              <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#4F5330" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#657080', marginTop: 8 }}>
                  Transferring bed...
                </Text>
              </View>
            ) : vacantBedsList.length === 0 ? (
              <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                <BedDouble size={40} color="#CBD5E1" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginTop: 8 }}>
                  No other vacant beds available
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {vacantBedsList.map(({ bed, room }, idx) => (
                  <TouchableOpacity
                    key={bed._id}
                    onPress={() => handleSelectNewBed(bed._id, bed.bedNumber)}
                    style={{
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: idx < vacantBedsList.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0ECE1',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                        Bed {bed.bedNumber}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                      >
                        Room {room.roomNumber} · Floor {room.floorNumber}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#4F5330' }}>
                        {formatINR(room.baseRentPaisePerBed || 0)}
                      </Text>
                      <Text
                        style={{ fontSize: 11, fontWeight: '700', color: '#657080', marginTop: 2 }}
                      >
                        Tap to move
                      </Text>
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
