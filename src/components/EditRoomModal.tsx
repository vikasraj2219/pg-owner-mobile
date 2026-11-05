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
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, DoorOpen, Trash2, Plus, Minus, AlertCircle, BedDouble } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixRoom, IRoom } from '../types/api';
import { updateRoomApi, deleteRoomApi } from '../api/properties';
import { formatINR } from '../utils/currency';

interface EditRoomModalProps {
  visible: boolean;
  propertyId: string;
  room: IMatrixRoom | IRoom | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  visible,
  propertyId,
  room,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [roomNumber, setRoomNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState('1');
  const [sharingType, setSharingType] = useState<number>(3);
  const [showCustomSharing, setShowCustomSharing] = useState(false);
  const [rentPerBed, setRentPerBed] = useState('7500');
  const [hasAC, setHasAC] = useState(true);
  const [hasWashroom, setHasWashroom] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (room && visible) {
      setRoomNumber(room.roomNumber || '');
      setFloorNumber((room.floorNumber ?? 1).toString());
      setSharingType(room.sharingType || 3);
      setShowCustomSharing((room.sharingType || 3) > 6);
      setRentPerBed(
        room.baseRentPaisePerBed ? (room.baseRentPaisePerBed / 100).toString() : '7500',
      );
      const tags = room.tags || [];
      setHasAC(tags.includes('AC'));
      setHasWashroom(tags.includes('Attached Washroom'));
    }
  }, [room, visible]);

  if (!visible || !room) return null;

  const handleSave = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a room number.');
      return;
    }

    const floorInt = parseInt(floorNumber.trim(), 10);
    if (isNaN(floorInt)) {
      Alert.alert('Invalid Floor', 'Please enter a valid floor number (e.g. 0, 1, 2).');
      return;
    }

    const rentNumeric = parseFloat(rentPerBed);
    if (isNaN(rentNumeric) || rentNumeric < 0) {
      Alert.alert('Invalid Rent', 'Please enter a valid monthly rent per bed.');
      return;
    }

    const tags: string[] = [];
    if (hasAC) tags.push('AC');
    if (hasWashroom) tags.push('Attached Washroom');
    if (sharingType === 1) tags.push('Single');
    else if (sharingType === 2) tags.push('Double');
    else if (sharingType === 3) tags.push('Triple');
    else tags.push(`${sharingType}-sharing`);

    setIsSaving(true);
    try {
      await updateRoomApi(propertyId, room._id, {
        roomNumber: roomNumber.trim(),
        floorNumber: floorInt,
        sharingType,
        baseRentPaisePerBed: Math.round(rentNumeric * 100),
        tags,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      Alert.alert('Success', `Room ${roomNumber} updated successfully.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update room');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete Room ${room.roomNumber}?`,
      'This will delete this room and all its vacant beds. If any bed is occupied, deletion will be blocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Room',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteRoomApi(propertyId, room._id);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['matrix'] }),
                queryClient.invalidateQueries({ queryKey: ['properties'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
              ]);

              Alert.alert('Deleted', `Room ${room.roomNumber} has been deleted.`);
              onSuccess?.();
              onClose();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err instanceof Error ? err.message : 'Failed to delete room');
              Alert.alert('Delete Blocked', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const rentNumeric = parseFloat(rentPerBed) || 0;
  const totalPotential = rentNumeric * sharingType;

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
              <DoorOpen size={20} color="#0A6C50" />
            </View>
            <View>
              <Text className="text-lg font-extrabold text-slate-900">
                Edit Room {room.roomNumber}
              </Text>
              <Text className="text-xs font-semibold text-slate-500">
                Adjust room number, floor & bed sharing
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
          {/* Room Number & Floor Grid */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Room Number *
              </Text>
              <TextInput
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. 101"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-extrabold text-slate-900 text-base shadow-xs"
              />
            </View>
            <View className="w-32">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Floor *
              </Text>
              <TextInput
                value={floorNumber}
                onChangeText={setFloorNumber}
                placeholder="1"
                keyboardType="number-pad"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-extrabold text-slate-900 text-base shadow-xs text-center"
              />
            </View>
          </View>

          {/* Sharing Type Selector (1 to 6 + More) */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sharing Type (Beds per Room) *
              </Text>
              <Text className="text-xs font-bold text-[#0A6C50]">
                {sharingType} {sharingType === 1 ? 'Bed' : 'Beds'}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map(count => {
                const isSelected = sharingType === count && !showCustomSharing;
                return (
                  <TouchableOpacity
                    key={count}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSharingType(count);
                      setShowCustomSharing(false);
                    }}
                    className={`min-w-[42px] flex-1 py-3 rounded-xl items-center justify-center border shadow-xs ${
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
                  if (sharingType <= 6) setSharingType(7);
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
                  {showCustomSharing && sharingType > 6 ? `${sharingType} Beds` : '+ More'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Sharing Stepper */}
            {showCustomSharing && (
              <View className="mt-3 flex-row items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Text className="text-xs font-bold text-slate-700">Custom Bed Capacity:</Text>
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

            <View className="mt-2 flex-row items-start">
              <AlertCircle size={13} color="#64748B" className="mt-0.5" />
              <Text className="text-[11px] text-slate-500 font-medium ml-1.5 flex-1">
                Increasing beds adds new available slots. Reducing beds safely drops only vacant
                beds.
              </Text>
            </View>
          </View>

          {/* Monthly Base Rent per bed */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Monthly Rent per Bed (₹) *
            </Text>
            <View className="relative justify-center">
              <Text className="absolute left-4 font-black text-slate-400 text-lg">₹</Text>
              <TextInput
                value={rentPerBed}
                onChangeText={setRentPerBed}
                placeholder="7500"
                keyboardType="numeric"
                className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-3 font-extrabold text-slate-900 text-base shadow-xs"
              />
            </View>
          </View>

          {/* Amenities Switches */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between mb-2.5 shadow-xs">
            <Text className="text-sm font-semibold text-slate-900">Air Conditioning (AC)</Text>
            <Switch
              value={hasAC}
              onValueChange={setHasAC}
              trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between mb-4 shadow-xs">
            <Text className="text-sm font-semibold text-slate-900">Attached Washroom</Text>
            <Switch
              value={hasWashroom}
              onValueChange={setHasWashroom}
              trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Revenue Potential Box */}
          <View className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3.5 mb-5 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <BedDouble size={16} color="#0A6C50" />
              <Text className="text-xs font-bold text-emerald-950 ml-2">Total Room Potential</Text>
            </View>
            <Text className="text-sm font-black text-[#0A6C50]">
              {formatINR(totalPotential * 100)} / mo
            </Text>
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
              <Text className="text-white font-extrabold text-base">Save Room Changes</Text>
            )}
          </TouchableOpacity>

          {/* Delete Room Button */}
          <View className="border-t border-slate-200/80 pt-3 pb-8">
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
                    Delete Room (Only if All Beds Vacant)
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
