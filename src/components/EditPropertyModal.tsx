import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  Building,
  Pencil,
  MapPin,
  Mail,
  QrCode,
  Copy,
  Zap,
  Lightbulb,
  ArrowRight,
  Trash2,
  Navigation,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { IProperty, PropertyType } from '../types/api';
import { updatePropertyApi, deletePropertyApi } from '../api/properties';
import { useProperties } from '../context/PropertyContext';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SuccessActionModal } from './SuccessActionModal';

interface EditPropertyModalProps {
  visible: boolean;
  property: IProperty | null;
  onClose: () => void;
  onSuccess?: (updated: IProperty) => void;
}

export const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  visible,
  property,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { setSelectedPropertyId, properties } = useProperties();

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('coliving');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [electricityRate, setElectricityRate] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<IProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOccupiedWarningModal, setShowOccupiedWarningModal] = useState(false);

  useEffect(() => {
    if (property && visible) {
      setName(property.name || '');
      setType(property.type || 'coliving');
      const rawAddress = property.address || '';
      setAddress(rawAddress);

      // Extract city & pincode from explicit property fields or fall back to address parsing
      let initialPincode = property.pincode || '';
      if (!initialPincode && rawAddress) {
        const pinMatch = rawAddress.match(/\b([1-9][0-9]{5})\b/);
        if (pinMatch) {
          initialPincode = pinMatch[1];
        }
      }

      let initialCity = property.city || '';
      if (!initialCity && rawAddress) {
        const segments = rawAddress.split(',').map(s => s.trim());
        const nonPinSegments = segments.filter(s => !/\b[1-9][0-9]{5}\b/.test(s) && s.length > 0);
        if (nonPinSegments.length >= 2) {
          initialCity = nonPinSegments[nonPinSegments.length - 1];
        } else if (nonPinSegments.length === 1 && !/\d/.test(nonPinSegments[0])) {
          initialCity = nonPinSegments[0];
        }
      }

      setCity(initialCity);
      setPincode(initialPincode);
      setUpiVpa(property.upiVpa || '');
      setElectricityRate(
        property.electricityRatePaisePerUnit
          ? (property.electricityRatePaisePerUnit / 100).toString()
          : '0',
      );
      setShowDeleteConfirm(false);
    }
  }, [property, visible]);

  if (!visible || !property) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a property name.');
      return;
    }

    if (!upiVpa.trim()) {
      Alert.alert('Required Field', 'Please enter a UPI ID (VPA) for tenant QR payments.');
      return;
    }

    const rateNumeric = parseFloat(electricityRate);
    if (isNaN(rateNumeric) || rateNumeric < 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid electricity rate per unit.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updatePropertyApi(property._id, {
        name: name.trim(),
        type,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        upiVpa: upiVpa.trim(),
        electricityRatePaisePerUnit: Math.round(rateNumeric * 100),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', property._id] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      setSavedSuccess(updated);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update property');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    const occupiedCount = property.stats?.occupiedBeds || 0;
    if (occupiedCount > 0) {
      setShowOccupiedWarningModal(true);
      return;
    }

    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePropertyApi(property._id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      const other = properties.find(p => p._id !== property._id);
      if (other) {
        await setSelectedPropertyId(other._id);
      }

      Alert.alert('Deleted', `Property "${property.name}" has been deleted.`);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete property');
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
      >
        {/* Header matching Reference */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
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

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}
            >
              Edit Property
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
              Update property details
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeleteClick}
            disabled={isDeleting}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FFF1F2',
              borderWidth: 1,
              borderColor: '#FECDD3',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Delete property"
          >
            <Trash2 size={18} color="#BE123C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FAF5EB' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Property Preview Card matching Left Screen */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 20,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            {/* Building Image / Graphic Thumbnail */}
            <View
              style={{
                width: 96,
                height: 84,
                borderRadius: 14,
                backgroundColor: '#EAE8DF',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginRight: 14,
              }}
            >
              <Building2 size={42} color="#4F5330" strokeWidth={1.8} />
            </View>

            {/* Info Column */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                  Property Preview
                </Text>
                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E7D32' }}>Active</Text>
                </View>
              </View>

              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                {name || property.name}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 3,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080' }}>
                  {type === 'boys'
                    ? 'Premium PG for Boys'
                    : type === 'girls'
                      ? 'Premium PG for Girls'
                      : 'Coliving PG'}
                </Text>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: '#FAF7F2',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={11} color="#4F5330" />
                </View>
              </View>
            </View>
          </View>

          {/* Property Name Input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              Property Name *
            </Text>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 52,
                justifyContent: 'center',
              }}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Blossom Luxury PG"
                placeholderTextColor="#94A3B8"
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
            </View>
          </View>

          {/* Property Type Selection matching Left Screen */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              Property Type
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { id: 'boys', label: 'Boys', icon: '👦' },
                { id: 'girls', label: 'Girls', icon: '👧' },
                { id: 'coliving', label: 'Coliving', icon: '👥' },
              ].map(item => {
                const isSelected = type === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => setType(item.id as PropertyType)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 16,
                      borderWidth: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>{item.icon}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isSelected ? '#0C192B' : '#0C192B',
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Street Address */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MapPin size={14} color="#657080" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                Street Address
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Building2 size={18} color="#657080" style={{ marginRight: 10 }} />
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street address, area"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
              <Navigation size={18} color="#657080" />
            </View>
          </View>

          {/* City & Pincode Row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* City */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
                City
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Building size={18} color="#657080" style={{ marginRight: 8 }} />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0C192B',
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>

            {/* Pincode */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
                Pincode
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Mail size={18} color="#657080" style={{ marginRight: 8 }} />
                <TextInput
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Pincode"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0C192B',
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>
          </View>

          {/* UPI ID for Rent Collection */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <QrCode size={15} color="#4F5330" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                UPI ID for Rent Collection
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={upiVpa}
                onChangeText={setUpiVpa}
                placeholder="name@upi"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  if (upiVpa.trim()) {
                    Alert.alert('Copied', `UPI ID ${upiVpa} copied.`);
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Copy size={18} color="#657080" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Electricity Rate */}
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Zap size={15} color="#4F5330" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                Electricity Rate (₹ / Unit)
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={electricityRate}
                onChangeText={setElectricityRate}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>/ unit</Text>
            </View>
          </View>

          {/* Tip Banner matching Left Screen */}
          <View
            style={{
              backgroundColor: '#F4F8EC',
              borderWidth: 1,
              borderColor: '#D9E8CE',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#E5EED6',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Lightbulb size={16} color="#4F5330" />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: '600',
                color: '#4F5330',
                lineHeight: 17,
              }}
            >
              Keep your property details updated for accurate reports and billing.
            </Text>
          </View>
        </ScrollView>

        {/* Modern Modal when Property Cannot Be Deleted Due to Active Tenants */}
        <Modal
          visible={showOccupiedWarningModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOccupiedWarningModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 25, 43, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                padding: 24,
                width: '100%',
                maxWidth: 380,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              {/* Header Icon & Close */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={24} color="#D97706" strokeWidth={2.3} />
                </View>

                <TouchableOpacity
                  onPress={() => setShowOccupiedWarningModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FAF5EB',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#657080" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: '#0C192B',
                  letterSpacing: -0.3,
                  marginBottom: 8,
                }}
              >
                Cannot Delete Property
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#4B5563',
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#0C192B' }}>
                  {property.stats?.occupiedBeds || 1} tenant(s)
                </Text>{' '}
                are currently staying at{' '}
                <Text style={{ fontWeight: '700', color: '#0C192B' }}>{property.name}</Text>.
              </Text>

              {/* Guidance Box */}
              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '600',
                    color: '#92400E',
                    lineHeight: 18,
                  }}
                >
                  To protect active tenant leases and billing records, please checkout or transfer
                  all occupants before deleting this property.
                </Text>
              </View>

              {/* Single Primary Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowOccupiedWarningModal(false)}
                style={{
                  backgroundColor: '#4F5330',
                  height: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                  Understood
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Beautiful Delete Property Confirmation Modal */}
        <ConfirmDeleteModal
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={executeDelete}
          title={`Delete "${property.name}"?`}
          message="This removes all floors, rooms, and empty beds. No tenants currently live here. This action cannot be undone."
          confirmLabel="Delete Property"
          isLoading={isDeleting}
          requiresInput={property.name}
        />

        {/* Primary Save Changes CTA Button matching Left Screen */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
            borderTopWidth: 1,
            borderTopColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={isSaving}
            style={{
              width: '100%',
              backgroundColor: '#4F5330',
              height: 52,
              borderRadius: 9999,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#4F5330',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                  Save Changes
                </Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Modern In-App Success Modal for Property Update */}
        <SuccessActionModal
          visible={!!savedSuccess}
          onClose={() => {
            const up = savedSuccess;
            setSavedSuccess(null);
            if (up) onSuccess?.(up);
            onClose();
          }}
          title="Property Updated Successfully!"
          message={`Property "${savedSuccess?.name}" details have been updated.`}
          highlightCard={{
            icon: <Building2 size={16} color="#15803D" />,
            title: savedSuccess?.name || 'Property',
            subtitle: savedSuccess?.city
              ? `${savedSuccess.city} · ${savedSuccess.type}`
              : savedSuccess?.type || '',
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
