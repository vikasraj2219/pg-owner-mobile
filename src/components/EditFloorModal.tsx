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
import { X, Layers, Trash2 } from 'lucide-react-native';
import { updateFloorApi, deleteFloorApi } from '../api/properties';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixFloor } from '../types/api';

interface EditFloorModalProps {
  visible: boolean;
  propertyId: string;
  floor: IMatrixFloor | null;
  onClose: () => void;
  onSuccess?: () => void;
  onViewTenants?: () => void;
}

export const EditFloorModal: React.FC<EditFloorModalProps> = ({
  visible,
  propertyId,
  floor,
  onClose,
  onSuccess,
  onViewTenants,
}) => {
  const queryClient = useQueryClient();
  const [floorNumber, setFloorNumber] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute occupied beds count on this floor
  const occupiedBedsCount = React.useMemo(() => {
    if (!floor) return 0;
    return floor.rooms.reduce((acc, room) => {
      return acc + room.beds.filter(b => b.status === 'occupied').length;
    }, 0);
  }, [floor]);

  const hasTenants = occupiedBedsCount > 0;

  useEffect(() => {
    if (floor && visible) {
      setFloorNumber(floor.floorNumber.toString());
      setFloorLabel(floor.floorLabel || '');
    }
  }, [floor, visible]);

  if (!visible || !floor) return null;

  const handleSave = async () => {
    const floorInt = parseInt(floorNumber.trim(), 10);
    if (isNaN(floorInt)) {
      Alert.alert('Required Field', 'Please enter a valid floor number (e.g. 0, 1, 2...).');
      return;
    }

    setIsSaving(true);
    try {
      await updateFloorApi(propertyId, floor.floorNumber, {
        floorNumber: hasTenants ? undefined : floorInt,
        floorLabel: floorLabel.trim(),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
      ]);

      Alert.alert('Success', `Floor ${floorInt} updated successfully.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update floor');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (hasTenants) {
      Alert.alert(
        `Can't delete Floor ${floor.floorNumber}`,
        `${occupiedBedsCount} tenant${occupiedBedsCount === 1 ? ' is' : 's are'} staying on this floor. Move or check them out first, then you can delete the floor and its rooms.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View tenants',
            onPress: () => {
              onClose();
              onViewTenants?.();
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      `Delete Floor ${floor.floorNumber}?`,
      `This removes Floor ${floor.floorNumber} and its ${floor.rooms.length} vacant room(s). No tenants currently live here. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete floor',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteFloorApi(propertyId, floor.floorNumber);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
                queryClient.invalidateQueries({ queryKey: ['properties'] }),
              ]);
              Alert.alert('Deleted', `Floor ${floor.floorNumber} deleted successfully.`);
              onSuccess?.();
              onClose();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err instanceof Error ? err.message : 'Failed to delete floor');
              Alert.alert('Error', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
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
              <Text className="text-lg font-black text-slate-900">
                Edit Floor {floor.floorNumber}
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
            {/* Floor Number */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Floor number *
              </Text>
              <TextInput
                value={floorNumber}
                onChangeText={setFloorNumber}
                editable={!hasTenants}
                keyboardType="number-pad"
                className={`border rounded-xl px-4 py-3 font-bold text-base shadow-xs ${
                  hasTenants
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              {hasTenants && (
                <Text className="text-2xs text-amber-700 font-semibold mt-1">
                  Floor number cannot be changed while tenants are staying on this floor.
                </Text>
              )}
            </View>

            {/* Label (optional) */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Label (optional)
              </Text>
              <TextInput
                value={floorLabel}
                onChangeText={setFloorLabel}
                placeholder="e.g. Ground floor, Penthouse"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-900 text-sm shadow-xs"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={isSaving}
              className="w-full bg-[#0A6C50] py-3.5 rounded-xl items-center justify-center shadow-xs mb-3"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-extrabold text-base">Save floor</Text>
              )}
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDelete}
              disabled={isDeleting}
              className="w-full bg-rose-50 border border-rose-200 py-3 rounded-xl items-center justify-center flex-row gap-2"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#BE123C" />
              ) : (
                <>
                  <Trash2 size={16} color="#BE123C" />
                  <Text className="text-xs font-bold text-[#BE123C]">Delete floor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
