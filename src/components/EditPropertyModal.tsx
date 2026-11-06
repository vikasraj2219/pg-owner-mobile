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
  X,
  Building2,
  Trash2,
  MapPin,
  QrCode,
  Zap,
  Archive,
  AlertCircle,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { IProperty, PropertyType } from '../types/api';
import { updatePropertyApi, deletePropertyApi } from '../api/properties';
import { useProperties } from '../context/PropertyContext';

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
  const [electricityRate, setElectricityRate] = useState('12');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');

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
          : '12',
      );
      setShowDeleteConfirm(false);
      setConfirmNameInput('');
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

      Alert.alert('Success', `Property "${updated.name}" updated successfully.`);
      onSuccess?.(updated);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update property');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    const isCurrentlyArchived = !!property.isArchived;
    const actionLabel = isCurrentlyArchived ? 'Unarchive' : 'Archive';

    Alert.alert(
      `${actionLabel} Property?`,
      isCurrentlyArchived
        ? `Unarchiving "${property.name}" will make it visible in active property listings again.`
        : `Archiving "${property.name}" preserves all tenant histories, invoices, and beds while hiding it from day-to-day operations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          onPress: async () => {
            setIsArchiving(true);
            try {
              const updated = await updatePropertyApi(property._id, {
                isArchived: !isCurrentlyArchived,
              });
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['properties'] }),
                queryClient.invalidateQueries({ queryKey: ['propertyMatrix', property._id] }),
                queryClient.invalidateQueries({ queryKey: ['matrix'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
              ]);
              Alert.alert(
                'Success',
                `Property "${updated.name}" has been ${actionLabel.toLowerCase()}d.`,
              );
              onSuccess?.(updated);
              onClose();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err instanceof Error
                  ? err.message
                  : `Failed to ${actionLabel.toLowerCase()} property`);
              Alert.alert('Error', msg);
            } finally {
              setIsArchiving(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteClick = () => {
    const occupiedCount = property.stats?.occupiedBeds || 0;
    if (occupiedCount > 0) {
      Alert.alert(
        "Can't delete this property",
        `${occupiedCount} tenant(s) are staying at ${property.name}. Check them out first, or archive the property to hide it and keep its history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive property',
            onPress: handleToggleArchive,
          },
        ],
      );
      return;
    }

    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (confirmNameInput.trim().toLowerCase() !== property.name.trim().toLowerCase()) {
      Alert.alert('Name Mismatch', 'Please type the exact property name to confirm deletion.');
      return;
    }

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
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-100 bg-white">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
              <Building2 size={20} color="#0A6C50" />
            </View>
            <View>
              <Text className="text-xl font-extrabold text-slate-900">Edit Property</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Update branch details, UPI & EB rates
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Property Name */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Property Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Blossom Luxury PG"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-base shadow-xs"
            />
          </View>

          {/* Property Type Pills */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Property Type *
            </Text>
            <View className="flex-row gap-2">
              {(['boys', 'girls', 'coliving'] as PropertyType[]).map(t => {
                const isSelected = type === t;
                const label = t === 'boys' ? 'Boys' : t === 'girls' ? 'Girls' : 'Coliving';
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    className={`flex-1 py-3 rounded-xl items-center justify-center border shadow-xs ${
                      isSelected ? 'bg-[#0A6C50] border-[#0A6C50]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-extrabold ${
                        isSelected ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Street Address */}
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <MapPin size={14} color="#64748B" />
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Street Address
              </Text>
            </View>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. #42, 4th Cross, 5th Block, Koramangala"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              className="bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-medium text-slate-900 text-sm shadow-xs"
            />
          </View>

          {/* City & Pincode Side by Side */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Bengaluru"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
              />
            </View>
            <View className="w-36">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pincode
              </Text>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="e.g. 560034"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
              />
            </View>
          </View>

          {/* UPI ID for Rent */}
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <QrCode size={14} color="#0A6C50" />
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                UPI ID for Rent Collection *
              </Text>
            </View>
            <TextInput
              value={upiVpa}
              onChangeText={setUpiVpa}
              placeholder="e.g. blossompg@okaxis"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
            />
            <Text className="text-2xs text-slate-500 font-medium mt-1">
              Used to generate dynamic QR codes for rent receipts and invoices
            </Text>
          </View>

          {/* Electricity Rate */}
          <View className="mb-6">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <Zap size={14} color="#0A6C50" />
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Electricity Rate (₹ / unit) *
              </Text>
            </View>
            <TextInput
              value={electricityRate}
              onChangeText={setElectricityRate}
              placeholder="12"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
            />
          </View>

          {/* Destructive Actions Row: Archive & Delete */}
          <View className="pt-2 pb-6 border-t border-slate-200">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={handleToggleArchive}
                disabled={isArchiving}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200"
              >
                <Archive size={14} color="#475569" />
                <Text className="text-xs font-bold text-slate-700">
                  {property.isArchived ? 'Unarchive property' : 'Archive property'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteClick}
                disabled={isDeleting}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200"
              >
                <Trash2 size={14} color="#BE123C" />
                <Text className="text-xs font-bold text-[#BE123C]">Delete property</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Delete Property Confirmation Sheet / Overlay */}
        {showDeleteConfirm && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center p-5 z-50">
            <View className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
              <View className="w-12 h-12 rounded-full bg-rose-100 items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} color="#BE123C" />
              </View>
              <Text className="text-lg font-black text-slate-900 text-center mb-1">
                Delete &quot;{property.name}&quot;?
              </Text>
              <Text className="text-xs text-slate-600 text-center mb-4 leading-relaxed">
                This removes all floors, rooms, and empty beds. No tenants currently live here. This
                action cannot be undone. Type the property name to confirm:
              </Text>

              <TextInput
                value={confirmNameInput}
                onChangeText={setConfirmNameInput}
                placeholder={property.name}
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 text-sm mb-4"
              />

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setConfirmNameInput('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-slate-300 items-center"
                >
                  <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executeDelete}
                  disabled={
                    isDeleting ||
                    confirmNameInput.trim().toLowerCase() !== property.name.trim().toLowerCase()
                  }
                  className={`flex-1 py-3 rounded-xl items-center ${
                    confirmNameInput.trim().toLowerCase() === property.name.trim().toLowerCase()
                      ? 'bg-rose-600'
                      : 'bg-rose-300'
                  }`}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-xs font-bold text-white">Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Primary Save Button */}
        <View className="p-4 border-t border-slate-200 bg-white shadow-lg">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={isSaving}
            className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center justify-center shadow-xs"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-extrabold text-base">Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
