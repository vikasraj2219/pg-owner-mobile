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
import { X, Bed as BedIcon, Trash2, CheckCircle2, Wrench, User } from 'lucide-react-native';
import { updateBedApi, deleteBedApi } from '../api/properties';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixBed, IMatrixRoom, BedStatus } from '../types/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { formatINR } from '../utils/currency';

interface EditBedModalProps {
  visible: boolean;
  propertyId: string;
  room: IMatrixRoom | null;
  bed: IMatrixBed | null;
  onClose: () => void;
  onSuccess?: () => void;
  onViewTenant?: (tenantId: string) => void;
}

export const EditBedModal: React.FC<EditBedModalProps> = ({
  visible,
  propertyId,
  room: _room,
  bed,
  onClose,
  onSuccess,
  onViewTenant,
}) => {
  const queryClient = useQueryClient();
  const [bedLabel, setBedLabel] = useState('');
  const [rent, setRent] = useState('');
  const [status, setStatus] = useState<BedStatus>('available');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOccupied = bed?.status === 'occupied' || !!bed?.currentTenant;
  const tenantName = bed?.currentTenant?.fullName;

  useEffect(() => {
    if (bed && visible) {
      setBedLabel(bed.bedNumber || '');
      setStatus(bed.status || 'available');
      setReason(bed.maintenanceNote || '');
      const defaultRentPaise =
        bed.baseRentPaise || bed.currentTenant?.monthlyRentPaise || _room?.baseRentPaisePerBed || 0;
      setRent(defaultRentPaise ? String(Math.round(defaultRentPaise / 100)) : '');
    }
  }, [bed, visible, _room]);

  if (!visible || !bed) return null;

  const handleSave = async () => {
    if (!bedLabel.trim()) {
      Alert.alert('Required Field', 'Please enter a bed label.');
      return;
    }

    const rentNum = parseFloat(rent.trim());
    const rentPaise = !isNaN(rentNum) && rentNum >= 0 ? Math.round(rentNum * 100) : undefined;

    setIsSaving(true);
    try {
      await updateBedApi(bed._id, {
        bedNumber: bedLabel.trim(),
        baseRentPaise: rentPaise,
        status: isOccupied ? undefined : status,
        maintenanceNote:
          status === 'maintenance' ? reason.trim() || 'Under maintenance' : undefined,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      Alert.alert('Success', `Bed ${bedLabel.trim()} updated.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update bed');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (isOccupied) {
      Alert.alert(
        `Can't delete bed ${bed.bedNumber}`,
        `${tenantName || 'A tenant'} is staying in this bed. Check them out or move them to another bed first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View tenant',
            onPress: () => {
              onClose();
              if (bed.currentTenant?._id) {
                onViewTenant?.(bed.currentTenant._id);
              }
            },
          },
        ],
      );
      return;
    }

    setShowDeleteConfirm(true);
  };

  const executeDeleteBed = async () => {
    if (!bed) return;
    setIsDeleting(true);
    try {
      await deleteBedApi(bed._id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete bed');
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
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
                <BedIcon size={18} color="#0A6C50" />
              </View>
              <Text className="text-lg font-black text-slate-900">Edit bed</Text>
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
                placeholder="e.g. 203-A"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-900 text-base shadow-xs"
              />
            </View>

            {/* Monthly Base Rent */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Monthly Rent (₹) *
                </Text>
                {_room?.baseRentPaisePerBed ? (
                  <Text className="text-2xs font-semibold text-slate-400">
                    Room default: {formatINR(_room.baseRentPaisePerBed)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-xs">
                <Text className="text-slate-400 font-extrabold mr-2 text-base">₹</Text>
                <TextInput
                  value={rent}
                  onChangeText={setRent}
                  placeholder={
                    _room?.baseRentPaisePerBed
                      ? String(Math.round(_room.baseRentPaisePerBed / 100))
                      : '8500'
                  }
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  className="flex-1 font-bold text-slate-900 text-base p-0"
                />
              </View>
              <Text className="text-2xs text-slate-400 mt-1">
                Customize the price for this specific bed (e.g. lower bunk, window side).
              </Text>
            </View>

            {/* If Occupied Banner */}
            {isOccupied && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex-row items-center gap-2.5">
                <User size={18} color="#1D4ED8" />
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-blue-900">
                    Occupied by {tenantName || 'Tenant'}
                  </Text>
                  <Text className="text-2xs text-blue-700 font-medium">
                    Status changes locked while occupied
                  </Text>
                </View>
              </View>
            )}

            {/* Status Pills (if not occupied) */}
            {!isOccupied && (
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Status
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
                    <CheckCircle2
                      size={16}
                      color={status === 'available' ? '#0A6C50' : '#64748B'}
                    />
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
            )}

            {/* Reason input (if status is maintenance) */}
            {status === 'maintenance' && !isOccupied && (
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason (optional)
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Broken mattress, repainting"
                  placeholderTextColor="#94A3B8"
                  className="bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-medium text-slate-900 text-sm shadow-xs"
                />
              </View>
            )}

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
                <Text className="text-white font-extrabold text-base">Save bed</Text>
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
                  <Text className="text-xs font-bold text-[#BE123C]">Delete bed</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Beautiful Confirm Delete Modal */}
        <ConfirmDeleteModal
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={executeDeleteBed}
          title={`Delete Bed ${bed?.bedNumber}?`}
          message="This empty bed will be removed permanently. This action cannot be undone."
          confirmLabel="Delete Bed"
          isLoading={isDeleting}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
