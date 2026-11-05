import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Bed as BedIcon, CheckCircle2, Wrench } from 'lucide-react-native';
import { addBedToRoomApi, updateBedApi } from '../api/properties';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixRoom, BedStatus } from '../types/api';
import { formatINR } from '../utils/currency';

interface AddBedModalProps {
  visible: boolean;
  propertyId: string;
  room: IMatrixRoom | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddBedModal: React.FC<AddBedModalProps> = ({
  visible,
  propertyId,
  room,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [bedLabel, setBedLabel] = useState('');
  const [status, setStatus] = useState<BedStatus>('available');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (room && visible) {
      // Find next letter suffix
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const existingBeds = room.beds || [];
      const nextIdx = existingBeds.length;
      const suffix = letters[nextIdx] || `${nextIdx + 1}`;
      setBedLabel(`${room.roomNumber}-${suffix}`);
      setStatus('available');
    }
  }, [room, visible]);

  if (!visible || !room) return null;

  const handleSubmit = async () => {
    if (!bedLabel.trim()) {
      Alert.alert('Required Field', 'Please enter a bed label.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newBed = await addBedToRoomApi(propertyId, room._id, {
        bedNumber: bedLabel.trim(),
      });

      if (status !== 'available' && newBed?._id) {
        await updateBedApi(newBed._id, {
          status,
          maintenanceNote: status === 'maintenance' ? 'Under maintenance' : undefined,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      Alert.alert('Bed Added', `Bed ${bedLabel.trim()} added to Room ${room.roomNumber}.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to add bed');
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextSharingCount = (room.beds?.length || 0) + 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 items-center justify-center p-5"
      >
        <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-100 bg-white">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center">
                <BedIcon size={18} color="#0A6C50" />
              </View>
              <Text className="text-lg font-black text-slate-900">
                Add bed to Room {room.roomNumber}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Form Body */}
          <View className="p-5">
            {/* Bed Label */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bed label *
              </Text>
              <TextInput
                value={bedLabel}
                onChangeText={setBedLabel}
                placeholder={`e.g. ${room.roomNumber}-D`}
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-900 text-base shadow-xs"
              />
              <Text className="text-2xs text-slate-400 font-medium mt-1">
                Next free label. You can customize it if needed.
              </Text>
            </View>

            {/* Status Pills */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Initial Status
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setStatus('available')}
                  className={`flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                    status === 'available'
                      ? 'bg-emerald-50 border-[#0A6C50]'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <CheckCircle2 size={16} color={status === 'available' ? '#0A6C50' : '#64748B'} />
                  <Text
                    className={`text-xs font-bold ${
                      status === 'available' ? 'text-[#0A6C50]' : 'text-slate-700'
                    }`}
                  >
                    Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStatus('maintenance')}
                  className={`flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                    status === 'maintenance'
                      ? 'bg-amber-50 border-amber-600'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <Wrench size={16} color={status === 'maintenance' ? '#D97706' : '#64748B'} />
                  <Text
                    className={`text-xs font-bold ${
                      status === 'maintenance' ? 'text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    Maintenance
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info Banner */}
            <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5">
              <Text className="text-xs text-slate-600 font-medium leading-relaxed">
                Room {room.roomNumber} becomes a{' '}
                <Text className="font-bold text-slate-900">{nextSharingCount}-sharing</Text> room at{' '}
                <Text className="font-bold text-slate-900">
                  {formatINR(room.baseRentPaisePerBed)}
                </Text>{' '}
                per bed.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center justify-center shadow-xs"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-extrabold text-base">Add bed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
