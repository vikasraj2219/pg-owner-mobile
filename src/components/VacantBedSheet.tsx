import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { UserPlus, X } from 'lucide-react-native';
import { IMatrixBed, IMatrixRoom } from '../types/api';
import { formatINR } from '../utils/currency';

interface VacantBedSheetProps {
  visible: boolean;
  onClose: () => void;
  bed: IMatrixBed | null;
  room: IMatrixRoom | null;
  onCheckIn: (bedId: string) => void;
  onMarkMaintenance: (bedId: string) => void;
  isLoading?: boolean;
}

export const VacantBedSheet: React.FC<VacantBedSheetProps> = ({
  visible,
  onClose,
  bed,
  room,
  onCheckIn,
  onMarkMaintenance,
  isLoading = false,
}) => {
  if (!bed || !room) return null;

  const sharingText =
    room.sharingType === 1
      ? 'Single'
      : room.sharingType === 2
        ? 'Double'
        : room.sharingType === 3
          ? 'Triple'
          : `${room.sharingType}-sharing`;

  const detailsSubtitle = [
    `Room ${room.roomNumber}`,
    `Floor ${room.floorNumber}`,
    sharingText,
    ...(room.tags || []),
  ].join(' · ');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl p-5 pt-3 pb-8">
              {/* Handle */}
              <View className="items-center mb-4">
                <View className="w-12 h-1.5 rounded-full bg-slate-300" />
              </View>

              {/* Close Button at top right */}
              <TouchableOpacity
                onPress={onClose}
                className="absolute top-4 right-5 w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>

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

              {/* Mark as under maintenance */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => onMarkMaintenance(bed._id)}
                className="py-3 items-center justify-center"
              >
                {isLoading ? (
                  <ActivityIndicator color="#64748B" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-slate-700">
                    Mark as under maintenance
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
