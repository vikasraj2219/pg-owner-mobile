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
import { X, Building2, Trash2, MapPin, QrCode, Zap } from 'lucide-react-native';
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
  const [upiVpa, setUpiVpa] = useState('');
  const [electricityRate, setElectricityRate] = useState('10');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (property && visible) {
      setName(property.name || '');
      setType(property.type || 'coliving');
      setAddress(property.address || '');
      setUpiVpa(property.upiVpa || '');
      setElectricityRate(
        property.electricityRatePaisePerUnit
          ? (property.electricityRatePaisePerUnit / 100).toString()
          : '10',
      );
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
        upiVpa: upiVpa.trim(),
        electricityRatePaisePerUnit: Math.round(rateNumeric * 100),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
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

  const handleDelete = () => {
    const occupiedCount = property.stats?.occupiedBeds || 0;
    if (occupiedCount > 0) {
      Alert.alert(
        'Cannot Delete Property',
        `This property currently has ${occupiedCount} active/occupied bed(s). You must check out or relocate all tenants before deleting this property.`,
      );
      return;
    }

    Alert.alert(
      `Delete "${property.name}"?`,
      'This will remove this property and its vacant rooms and beds. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Property',
          style: 'destructive',
          onPress: async () => {
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
              Alert.alert('Delete Error', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
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
        className="flex-1 bg-[#F8F9FA]"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center mr-3">
              <Building2 size={20} color="#0A6C50" />
            </View>
            <View>
              <Text className="text-lg font-extrabold text-slate-900">Edit Property</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Fix details, UPI VPA & electricity rate
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
              placeholder="e.g. Sri Sai Luxury PG for Gents"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-base shadow-xs"
            />
          </View>

          {/* Property Type Selector */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Property Type *
            </Text>
            <View className="flex-row gap-2">
              {(['boys', 'girls', 'coliving'] as PropertyType[]).map(t => {
                const isSelected = type === t;
                const label = t === 'boys' ? 'Boys PG' : t === 'girls' ? 'Girls PG' : 'Co-Living';
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.8}
                    onPress={() => setType(t)}
                    className={`flex-1 py-3 rounded-xl items-center justify-center border shadow-xs ${
                      isSelected ? 'bg-[#0A6C50] border-[#0A6C50]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <Text
                      className={`text-xs font-extrabold ${
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

          {/* UPI VPA for Rent Payments */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                UPI ID (VPA) *
              </Text>
              <View className="flex-row items-center">
                <QrCode size={12} color="#0A6C50" />
                <Text className="text-[10px] text-[#0A6C50] font-bold ml-1">For dynamic QR</Text>
              </View>
            </View>
            <TextInput
              value={upiVpa}
              onChangeText={setUpiVpa}
              placeholder="e.g. owner@okaxis or 9876543210@paytm"
              autoCapitalize="none"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-base shadow-xs"
            />
          </View>

          {/* Electricity Rate per unit */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Electricity Rate (₹ / Unit)
              </Text>
              <View className="flex-row items-center">
                <Zap size={12} color="#EAB308" />
                <Text className="text-[10px] text-amber-700 font-bold ml-1">
                  For sub-meter split
                </Text>
              </View>
            </View>
            <TextInput
              value={electricityRate}
              onChangeText={setElectricityRate}
              placeholder="10"
              keyboardType="decimal-pad"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-base shadow-xs"
            />
          </View>

          {/* Address */}
          <View className="mb-6">
            <View className="flex-row items-center mb-1.5">
              <MapPin size={13} color="#64748B" />
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Property Address
              </Text>
            </View>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. #42, 5th Cross, Koramangala 4th Block, Bengaluru"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
              style={{ minHeight: 70 }}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSaving}
            onPress={handleSave}
            className="bg-[#0A6C50] rounded-xl py-3.5 items-center justify-center flex-row shadow-sm mb-4"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-extrabold text-base">Save Property Changes</Text>
            )}
          </TouchableOpacity>

          {/* Danger Zone: Delete Property */}
          <View className="border-t border-slate-200/80 pt-4 pb-8">
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isDeleting}
              onPress={handleDelete}
              className="bg-rose-50 border border-rose-200 rounded-xl py-3 items-center justify-center flex-row"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#BE123C" />
              ) : (
                <>
                  <Trash2 size={16} color="#BE123C" />
                  <Text className="text-rose-700 font-bold text-xs ml-2">
                    Delete This Property (Only if Vacant)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
