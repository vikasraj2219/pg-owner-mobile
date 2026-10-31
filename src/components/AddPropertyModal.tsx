import React, { useState } from 'react';
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
import { ChevronLeft } from 'lucide-react-native';
import { PropertyType } from '../types/api';
import { useProperties } from '../context/PropertyContext';

interface AddPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (propertyId: string) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { createPropertyMutation, isCreating } = useProperties();

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('boys');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500081');
  const [upiVpa, setUpiVpa] = useState('');
  const [electricityRate, setElectricityRate] = useState('12');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a property name.');
      return;
    }
    if (!upiVpa.trim()) {
      Alert.alert('Required Field', 'Please enter a UPI ID for rent collection.');
      return;
    }

    const ratePaise = Math.round((parseFloat(electricityRate) || 0) * 100);
    const fullAddress = [street.trim(), city.trim(), pincode.trim()].filter(Boolean).join(', ');

    try {
      const created = await createPropertyMutation({
        name: name.trim(),
        type,
        address: fullAddress || undefined,
        upiVpa: upiVpa.trim().toLowerCase(),
        electricityRatePaisePerUnit: ratePaise,
      });

      // Reset form
      setName('');
      setStreet('');
      setUpiVpa('');
      setElectricityRate('12');

      onClose();
      if (onSuccess) {
        onSuccess(created._id);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save property. Please try again.';
      Alert.alert('Error', message);
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
        className="flex-1 bg-[#F8F9FA]"
      >
        {/* Top App Bar */}
        <View className="px-5 py-4 bg-white border-b border-slate-200 flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <ChevronLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-slate-900">Add property</Text>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Property Name */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Property name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sri Sai Boys PG"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900"
            />
          </View>

          {/* Type Segmented Control */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Type
            </Text>
            <View className="flex-row gap-3">
              {(['boys', 'girls', 'coliving'] as PropertyType[]).map(item => {
                const isSelected = type === item;
                const label = item === 'boys' ? 'Boys' : item === 'girls' ? 'Girls' : 'Coliving';
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.8}
                    onPress={() => setType(item)}
                    className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                      isSelected ? 'bg-[#0A6C50] border-[#0A6C50]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
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
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Street address
            </Text>
            <TextInput
              value={street}
              onChangeText={setStreet}
              placeholder="Street, area"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900"
            />
          </View>

          {/* City & Pincode Row */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                City
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pincode
              </Text>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="500081"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900"
              />
            </View>
          </View>

          {/* UPI ID for Rent */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              UPI ID for rent
            </Text>
            <TextInput
              value={upiVpa}
              onChangeText={setUpiVpa}
              placeholder="name@bank"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900"
            />
            <Text className="text-xs text-slate-500 mt-1.5">Tenants pay rent to this ID</Text>
          </View>

          {/* Electricity Rate */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Electricity rate
            </Text>
            <View className="flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-3.5">
              <TextInput
                value={electricityRate}
                onChangeText={setElectricityRate}
                placeholder="12"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="flex-1 text-base text-slate-900 p-0"
              />
              <Text className="text-sm font-semibold text-slate-500 ml-2">₹ / unit</Text>
            </View>
            <Text className="text-xs text-slate-500 mt-1.5">Used to price sub-meter readings</Text>
          </View>

          {/* Save Property Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isCreating}
            className="w-full bg-[#0A6C50] rounded-xl py-4 items-center justify-center shadow-sm"
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-extrabold text-white">Save property</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
