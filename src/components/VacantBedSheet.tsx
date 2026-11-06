import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { UserPlus, X, Trash2, Wrench } from 'lucide-react-native';
import { IMatrixBed, IMatrixRoom } from '../types/api';
import { formatINR } from '../utils/currency';

interface VacantBedSheetProps {
  visible: boolean;
  onClose: () => void;
  bed: IMatrixBed | null;
  room: IMatrixRoom | null;
  onCheckIn: (bedId: string) => void;
  onMarkMaintenance: (bedId: string) => void;
  onDeleteBed?: (bedId: string, bedNumber: string) => void;
  isLoading?: boolean;
}

export const VacantBedSheet: React.FC<VacantBedSheetProps> = ({
  visible,
  onClose,
  bed,
  room,
  onCheckIn,
  onMarkMaintenance,
  onDeleteBed,
  isLoading = false,
}) => {
  if (!bed || !room) return null;

  const filteredTags = (room.tags || [])
    .filter(
      tag =>
        !['single', 'double', 'triple'].includes(tag.toLowerCase()) &&
        !tag.toLowerCase().includes('sharing'),
    )
    .map(tag => (tag.toLowerCase() === 'attached washroom' ? 'Washroom' : tag));

  const detailsSubtitle = [
    `Room ${room.roomNumber}`,
    `Floor ${room.floorNumber}`,
    ...filteredTags,
  ].join(' · ');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl p-5 pt-3 pb-8">
              {/* Top Handle and Cancel/Close Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="w-8" />
                <View className="w-12 h-1.5 rounded-full bg-slate-300" />
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Bed Info Header */}
              <View className="flex-row items-center mb-6">
                <View className="bg-[#E8F5EE] border border-[#A7F3D0] rounded-xl px-3 py-2 mr-3.5 items-center justify-center">
                  <Text className="text-sm font-extrabold text-[#0A6C50]">{bed.bedNumber}</Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-lg font-extrabold text-slate-900">
                    Bed {bed.bedNumber} · Vacant
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5" numberOfLines={1}>
                    {detailsSubtitle}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-extrabold text-[#0A6C50]">
                    {formatINR(bed.baseRentPaise || room.baseRentPaisePerBed)}
                  </Text>
                  <Text className="text-xs text-slate-400 font-medium">per month</Text>
                </View>
              </View>

              {/* Check in Action Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onCheckIn(bed._id);
                }}
                className="w-full bg-[#0A6C50] rounded-2xl py-4 flex-row items-center justify-center mb-3.5 shadow-sm"
              >
                <UserPlus size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-base font-extrabold text-white ml-2.5">Check in tenant</Text>
              </TouchableOpacity>

              {/* Actions row: Mark Maintenance & Delete Bed */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isLoading}
                  onPress={() => onMarkMaintenance(bed._id)}
                  className="flex-1 py-3 items-center justify-center bg-slate-100 rounded-xl flex-row"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#64748B" size="small" />
                  ) : (
                    <>
                      <Wrench size={14} color="#64748B" />
                      <Text className="text-xs font-bold text-slate-700 ml-1.5">
                        Mark Maintenance
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {onDeleteBed && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={isLoading}
                    onPress={() => onDeleteBed(bed._id, bed.bedNumber)}
                    className="px-4 py-3 items-center justify-center bg-rose-50 border border-rose-200 rounded-xl flex-row"
                  >
                    <Trash2 size={15} color="#BE123C" />
                    <Text className="text-xs font-bold text-rose-700 ml-1.5">Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
