import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { IProperty } from '../types/api';

interface AddRoomModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
  onSubmit: (payload: {
    floorNumber: number;
    roomNumber: string;
    sharingType: number;
    baseRentPaisePerBed: number;
    tags: string[];
  }) => Promise<unknown>;
  isSubmitting: boolean;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  visible,
  onClose,
  property,
  onSubmit,
  isSubmitting,
}) => {
  const [floorNumber, setFloorNumber] = useState('1');
  const [roomNumber, setRoomNumber] = useState('101');
  const [sharingType, setSharingType] = useState<number>(3);
  const [hasAC, setHasAC] = useState(true);
  const [hasWashroom, setHasWashroom] = useState(true);
  const [rentPerBed, setRentPerBed] = useState('7500');

  // Generate preview of bed labels
  const bedLabels = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cleanRoom = roomNumber.trim() || '101';
    const count = Math.min(Math.max(1, sharingType), 20);
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(`${cleanRoom}-${letters[i]}`);
    }
    return result;
  }, [roomNumber, sharingType]);

  const rentNumeric = parseFloat(rentPerBed.replace(/,/g, '')) || 0;
  const totalMonthlyPotential = rentNumeric * sharingType;

  const handleCreate = async () => {
    const floor = parseInt(floorNumber, 10);
    if (isNaN(floor)) {
      Alert.alert('Required Field', 'Please enter a valid floor number.');
      return;
    }
    if (!roomNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a room number.');
      return;
    }
    if (rentNumeric <= 0) {
      Alert.alert('Required Field', 'Please enter a valid rent per bed.');
      return;
    }

    const tags: string[] = [];
    if (hasAC) tags.push('AC');
    if (hasWashroom) tags.push('Washroom');
    if (sharingType === 1) tags.push('Single');
    else if (sharingType === 2) tags.push('Double');
    else if (sharingType === 3) tags.push('Triple');

    try {
      await onSubmit({
        floorNumber: floor,
        roomNumber: roomNumber.trim(),
        sharingType,
        baseRentPaisePerBed: Math.round(rentNumeric * 100),
        tags,
      });

      // Increment room number suggestion for next room
      const currentNum = parseInt(roomNumber.trim(), 10);
      if (!isNaN(currentNum)) {
        setRoomNumber((currentNum + 1).toString());
      }
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create room and beds. Please check inputs and try again.';
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
          <View>
            <Text className="text-xl font-extrabold text-slate-900">Add room</Text>
            {property && (
              <Text className="text-xs font-medium text-slate-500 mt-0.5">{property.name}</Text>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Floor & Room Number Row */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Floor
              </Text>
              <TextInput
                value={floorNumber}
                onChangeText={setFloorNumber}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900 font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Room number
              </Text>
              <TextInput
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="101"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900 font-semibold"
              />
            </View>
          </View>

          {/* Sharing Type */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Sharing type
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4].map(count => {
                const isSelected = sharingType === count;
                return (
                  <TouchableOpacity
                    key={count}
                    activeOpacity={0.8}
                    onPress={() => setSharingType(count)}
                    className={`flex-1 py-3.5 rounded-xl items-center justify-center border ${
                      isSelected ? 'bg-[#0A6C50] border-[#0A6C50]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <Text
                      className={`text-base font-extrabold ${
                        isSelected ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* AC Switch */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-slate-900">Air conditioning</Text>
            <Switch
              value={hasAC}
              onValueChange={setHasAC}
              trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Washroom Switch */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-5">
            <Text className="text-base font-semibold text-slate-900">Attached washroom</Text>
            <Switch
              value={hasWashroom}
              onValueChange={setHasWashroom}
              trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Rent per bed */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Rent per bed
            </Text>
            <View className="flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-3.5">
              <TextInput
                value={rentPerBed}
                onChangeText={setRentPerBed}
                placeholder="7,500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="flex-1 text-base font-bold text-slate-900 p-0"
              />
              <Text className="text-sm font-semibold text-slate-500 ml-2">₹ / month</Text>
            </View>
          </View>

          {/* Live Preview Box (Matching Page 39) */}
          <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 mb-6">
            <Text className="text-sm font-bold text-[#1E40AF] mb-3">
              This will create beds {bedLabels.join(', ')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {bedLabels.map(label => (
                <View
                  key={label}
                  className="bg-[#DCFCE7] border border-[#86EFAC] px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-xs font-extrabold text-[#065F46]">{label}</Text>
                </View>
              ))}
            </View>
            <Text className="text-xs font-medium text-slate-600">
              {sharingType} beds × ₹{rentNumeric.toLocaleString('en-IN')} = ₹
              {totalMonthlyPotential.toLocaleString('en-IN')} a month when full
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreate}
            disabled={isSubmitting}
            className="w-full bg-[#0A6C50] rounded-xl py-4 items-center justify-center shadow-sm"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-extrabold text-white">Create room and beds</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
