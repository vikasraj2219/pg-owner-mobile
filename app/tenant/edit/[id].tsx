import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight, Repeat, Info } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantDetail } from '../../../src/hooks/useTenants';
import { updateTenantApi } from '../../../src/api/tenants';
import { BedTransferModal } from '../../../src/components/BedTransferModal';

export default function EditTenantScreen() {
  const router = useRouter();
  const { id, moveBed } = useLocalSearchParams<{ id: string; moveBed?: string }>();
  const queryClient = useQueryClient();

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

  // Auto-open move bed modal if opened with ?moveBed=true
  useEffect(() => {
    if (moveBed === 'true') {
      setIsMoveBedModalVisible(true);
    }
  }, [moveBed]);

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
    return (tenant.currentBed as any).bedNumber || 'N/A';
  }, [tenant]);

  const originalRentRupees = useMemo(() => {
    return tenant?.monthlyRentPaise ? tenant.monthlyRentPaise / 100 : 0;
  }, [tenant]);

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

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert('Success', 'Tenant details saved successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || err?.message || 'Could not update tenant details.',
      );
    } finally {
      setIsSaving(false);
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
      {/* Top Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        >
          <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>Edit Tenant</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Full name *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: '#0C192B',
              fontWeight: '600',
            }}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Phone Number */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Phone number *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: '#0C192B',
              fontWeight: '600',
            }}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Emergency Contact */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Emergency contact
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: '#0C192B',
              fontWeight: '600',
            }}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="Emergency phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Email Address */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Email address
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: '#0C192B',
              fontWeight: '600',
            }}
            value={email}
            onChangeText={setEmail}
            placeholder="tenant@email.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Monthly Rent */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Monthly rent (₹) *
          </Text>
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
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
                color: '#0C192B',
                fontWeight: '700',
              }}
              value={rentRupees}
              onChangeText={setRentRupees}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Security Deposit */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
            Security deposit (₹) *
          </Text>
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 14,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
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
                color: '#0C192B',
                fontWeight: '700',
              }}
              value={depositRupees}
              onChangeText={setDepositRupees}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
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
                backgroundColor: '#FAF7F0',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Repeat size={18} color="#4F5330" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                Move to another bed
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                Currently Bed {currentBedNumber} · ₹{originalRentRupees}/mo
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

      {/* Bottom Save Buttons */}
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
            marginBottom: 8,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Save changes</Text>
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

      {/* Unified Bed Transfer Modal */}
      {tenant && (
        <BedTransferModal
          visible={isMoveBedModalVisible}
          onClose={() => setIsMoveBedModalVisible(false)}
          tenant={tenant as any}
          propertyId={
            typeof tenant?.property === 'object' ? (tenant.property as any)?._id : tenant?.property
          }
          onTransferSuccess={() => {
            void refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}
