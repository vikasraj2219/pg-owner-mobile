import React, { useState, useMemo, useEffect } from 'react';
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
import { ChevronLeft, AlertCircle, Sparkles, Plus, Minus } from 'lucide-react-native';
import { IProperty } from '../types/api';
import { formatINR } from '../utils/currency';
import { getApiErrorMessage } from '../utils/validation';

interface AddRoomModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
  existingRooms?: string[];
  defaultFloor?: number;
  onSubmit: (payload: {
    floorNumber: number;
    roomNumber: string;
    sharingType: number;
    baseRentPaisePerBed: number;
    tags: string[];
  }) => Promise<unknown>;
  isSubmitting: boolean;
}

/**
 * Finds the next unused room number for a given floor
 */
function getNextAvailableRoomNumber(floor: number, existing: string[]): string {
  const normalizedSet = new Set(existing.map(r => r.toLowerCase().trim()));

  if (floor === 0) {
    // Ground floor: G01, G02, ...
    for (let i = 1; i <= 99; i++) {
      const candidate = i < 10 ? `G0${i}` : `G${i}`;
      if (!normalizedSet.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  // Standard floors (Floor 1 -> 101, 102... Floor 2 -> 201, 202...)
  const base = floor * 100;
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base + i}`;
    if (!normalizedSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${floor}01`;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  visible,
  onClose,
  property,
  existingRooms = [],
  defaultFloor = 1,
  onSubmit,
  isSubmitting,
}) => {
  const [floorNumber, setFloorNumber] = useState(defaultFloor.toString());
  const [roomNumber, setRoomNumber] = useState('');
  const [sharingType, setSharingType] = useState<number>(3);
  const [showCustomSharing, setShowCustomSharing] = useState(false);
  const [hasAC, setHasAC] = useState(true);
  const [hasWashroom, setHasWashroom] = useState(true);
  const [rentPerBed, setRentPerBed] = useState('7500');

  // Automatically suggest next available room number whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      const floorInt = parseInt(floorNumber, 10) || defaultFloor || 1;
      setFloorNumber(floorInt.toString());
      const suggested = getNextAvailableRoomNumber(floorInt, existingRooms);
      setRoomNumber(suggested);
    }
  }, [visible, defaultFloor, existingRooms]);

  // Handle floor number change and automatically recalculate suggested room number
  const handleFloorChange = (newFloorText: string) => {
    setFloorNumber(newFloorText);
    const parsedFloor = parseInt(newFloorText, 10);
    if (!isNaN(parsedFloor) && parsedFloor >= 0) {
      const suggested = getNextAvailableRoomNumber(parsedFloor, existingRooms);
      setRoomNumber(suggested);
    }
  };

  // Check if current entered room number already exists in this property
  const isDuplicateRoom = useMemo(() => {
    if (!roomNumber.trim()) return false;
    return existingRooms.some(r => r.toLowerCase().trim() === roomNumber.toLowerCase().trim());
  }, [roomNumber, existingRooms]);

  // Suggested unique room number if duplicate
  const suggestedAlternative = useMemo(() => {
    const floorInt = parseInt(floorNumber, 10);
    return getNextAvailableRoomNumber(isNaN(floorInt) ? 1 : floorInt, existingRooms);
  }, [floorNumber, existingRooms]);

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
      Alert.alert(
        'Required Field',
        'Please enter a valid floor number (e.g. 0 for Ground, 1, 2...).',
      );
      return;
    }
    if (!roomNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a room number.');
      return;
    }
    if (isDuplicateRoom) {
      Alert.alert(
        'Room Already Exists',
        `Room "${roomNumber.trim()}" already exists in ${property?.name || 'this property'}. Please enter a unique room number (e.g. "${suggestedAlternative}").`,
      );
      return;
    }
    if (rentNumeric <= 0) {
      Alert.alert('Required Field', 'Please enter a valid monthly rent per bed.');
      return;
    }

    const tags: string[] = [];
    if (hasAC) tags.push('AC');
    if (hasWashroom) tags.push('Washroom');

    try {
      await onSubmit({
        floorNumber: floor,
        roomNumber: roomNumber.trim(),
        sharingType,
        baseRentPaisePerBed: Math.round(rentNumeric * 100),
        tags,
      });

      // Suggest next room number for subsequent creation
      const nextSuggested = getNextAvailableRoomNumber(floor, [
        ...existingRooms,
        roomNumber.trim(),
      ]);
      setRoomNumber(nextSuggested);
      onClose();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      Alert.alert('Room Creation Failed', message);
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
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-slate-900">Add room</Text>
            {property && (
              <Text className="text-xs font-medium text-slate-500 mt-0.5" numberOfLines={1}>
                {property.name}
              </Text>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Floor & Room Number Row */}
          <View className="flex-row gap-3 mb-2">
            <View className="w-1/3">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Floor
              </Text>
              <TextInput
                value={floorNumber}
                onChangeText={handleFloorChange}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-base text-slate-900 font-semibold shadow-xs"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Room number
              </Text>
              <TextInput
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. 101"
                placeholderTextColor="#94A3B8"
                className={`bg-white border rounded-xl px-4 py-3.5 text-base text-slate-900 font-semibold shadow-xs ${
                  isDuplicateRoom ? 'border-[#BE123C] bg-rose-50/20' : 'border-slate-300'
                }`}
              />
            </View>
          </View>

          {/* Duplicate Room Warning & Auto-suggestion */}
          {isDuplicateRoom && (
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
              <View className="flex-row items-center mb-1.5">
                <AlertCircle size={16} color="#BE123C" />
                <Text className="text-xs font-bold text-[#BE123C] ml-1.5">
                  Room &quot;{roomNumber.trim()}&quot; already exists in this property!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRoomNumber(suggestedAlternative)}
                className="flex-row items-center bg-white border border-rose-200 py-1.5 px-2.5 rounded-lg self-start mt-1"
              >
                <Sparkles size={14} color="#0A6C50" />
                <Text className="text-xs font-bold text-[#0A6C50] ml-1.5">
                  Use next available: Room {suggestedAlternative}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isDuplicateRoom && (
            <View className="mb-4">
              <Text className="text-[11px] text-slate-400 font-medium ml-1">
                Must be unique within this property
              </Text>
            </View>
          )}

          {/* Sharing Type */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sharing type (Beds per room)
              </Text>
              <Text className="text-xs font-bold text-[#0A6C50]">
                {sharingType} {sharingType === 1 ? 'Bed' : 'Beds'}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {[1, 2, 3, 4].map(count => {
                const isSelected = sharingType === count && !showCustomSharing;
                return (
                  <TouchableOpacity
                    key={count}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSharingType(count);
                      setShowCustomSharing(false);
                    }}
                    className={`min-w-[48px] flex-1 py-3 rounded-xl items-center justify-center border shadow-xs ${
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowCustomSharing(true);
                  if (sharingType <= 4) setSharingType(5);
                }}
                className={`px-3 py-3 rounded-xl items-center justify-center border shadow-xs ${
                  showCustomSharing ? 'bg-[#0A6C50] border-[#0A6C50]' : 'bg-white border-slate-300'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    showCustomSharing ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {showCustomSharing && sharingType > 4 ? `${sharingType} Beds` : '+ Custom'}
                </Text>
              </TouchableOpacity>
            </View>

            {showCustomSharing && (
              <View className="mt-3 flex-row items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Text className="text-xs font-bold text-slate-700">Custom sharing capacity:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center"
                  >
                    <Minus size={15} color="#334155" />
                  </TouchableOpacity>
                  <TextInput
                    value={sharingType.toString()}
                    onChangeText={txt => {
                      const n = parseInt(txt.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(n)) setSharingType(Math.min(20, Math.max(1, n)));
                      else if (txt === '') setSharingType(1);
                    }}
                    keyboardType="number-pad"
                    className="w-12 h-8 bg-white border border-slate-300 rounded-lg text-center font-black text-slate-900"
                  />
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.min(20, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center"
                  >
                    <Plus size={15} color="#334155" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* AC Switch */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-3 shadow-xs">
            <Text className="text-base font-semibold text-slate-900">Air conditioning</Text>
            <Switch
              value={hasAC}
              onValueChange={setHasAC}
              trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Washroom Switch */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-5 shadow-xs">
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
            <View className="flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-3.5 shadow-xs">
              <TextInput
                value={rentPerBed}
                onChangeText={setRentPerBed}
                placeholder="7500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="flex-1 text-base font-bold text-slate-900 p-0"
              />
              <Text className="text-sm font-semibold text-slate-500 ml-2">₹ / month</Text>
            </View>
          </View>

          {/* Live Preview Box */}
          <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 mb-6">
            <Text className="text-sm font-bold text-[#1E40AF] mb-3">
              This will create beds: {bedLabels.join(', ')}
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
              {sharingType} beds × {formatINR(rentNumeric * 100)} ={' '}
              {formatINR(totalMonthlyPotential * 100)} a month when full
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreate}
            disabled={isSubmitting || isDuplicateRoom}
            className={`w-full rounded-xl py-4 items-center justify-center shadow-sm ${
              isDuplicateRoom ? 'bg-slate-300' : 'bg-[#0A6C50]'
            }`}
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
