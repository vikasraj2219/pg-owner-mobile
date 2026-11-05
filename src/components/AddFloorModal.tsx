import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Layers } from 'lucide-react-native';
import { createFloorApi } from '../api/properties';
import { useQueryClient } from '@tanstack/react-query';

interface AddFloorModalProps {
  visible: boolean;
  propertyId: string;
  defaultFloorNumber?: number;
  onClose: () => void;
  onFloorCreated: (floorNumber: number, floorLabel?: string, addRoomsNext?: boolean) => void;
}

export const AddFloorModal: React.FC<AddFloorModalProps> = ({
  visible,
  propertyId,
  defaultFloorNumber = 1,
  onClose,
  onFloorCreated,
}) => {
  const queryClient = useQueryClient();
  const [floorNumber, setFloorNumber] = useState(defaultFloorNumber.toString());
  const [floorLabel, setFloorLabel] = useState('');
  const [addRoomsNext, setAddRoomsNext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setFloorNumber(defaultFloorNumber.toString());
      setFloorLabel('');
      setAddRoomsNext(true);
    }
  }, [visible, defaultFloorNumber]);

  if (!visible) return null;

  const handleSubmit = async () => {
    const floorInt = parseInt(floorNumber.trim(), 10);
    if (isNaN(floorInt)) {
      Alert.alert(
        'Required Field',
        'Please enter a valid floor number (e.g. 0 for Ground, 1, 2...).',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createFloorApi(propertyId, {
        floorNumber: floorInt,
        floorLabel: floorLabel.trim() || undefined,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
      ]);

      onFloorCreated(floorInt, floorLabel.trim() || undefined, addRoomsNext);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to add floor');
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <Layers size={18} color="#0A6C50" />
              </View>
              <Text className="text-lg font-black text-slate-900">Add floor</Text>
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
            {/* Floor Number */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Floor number *
              </Text>
              <TextInput
                value={floorNumber}
                onChangeText={setFloorNumber}
                placeholder="e.g. 1 (or 0 for Ground)"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-900 text-base shadow-xs"
              />
            </View>

            {/* Label (optional) */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Label (optional)
              </Text>
              <TextInput
                value={floorLabel}
                onChangeText={setFloorLabel}
                placeholder="e.g. Ground floor, Penthouse, Terrace"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
              />
              <Text className="text-2xs text-slate-400 font-medium mt-1">
                Helpful friendly name for this floor level
              </Text>
            </View>

            {/* Add rooms next toggle */}
            <View className="flex-row items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-extrabold text-slate-800">Add rooms next</Text>
                <Text className="text-2xs text-slate-500 font-medium mt-0.5">
                  Opens room creator directly after floor is added
                </Text>
              </View>
              <Switch
                value={addRoomsNext}
                onValueChange={setAddRoomsNext}
                trackColor={{ false: '#CBD5E1', true: '#0A6C50' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center justify-center shadow-xs"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-extrabold text-base">Add floor</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
