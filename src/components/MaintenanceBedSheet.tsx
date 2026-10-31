import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Wrench, CheckCircle, X } from 'lucide-react-native';
import { IMatrixBed, IMatrixRoom } from '../types/api';

interface MaintenanceBedSheetProps {
  visible: boolean;
  onClose: () => void;
  bed: IMatrixBed | null;
  room: IMatrixRoom | null;
  onMarkAvailable: (bedId: string) => void;
  isLoading?: boolean;
}

export const MaintenanceBedSheet: React.FC<MaintenanceBedSheetProps> = ({
  visible,
  onClose,
  bed,
  room,
  onMarkAvailable,
  isLoading = false,
}) => {
  if (!bed || !room) return null;

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

              {/* Header */}
              <View className="flex-row items-center mb-5">
                <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mr-3.5">
                  <Wrench size={22} color="#64748B" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-lg font-extrabold text-slate-900">
                    Bed {bed.bedNumber} · Maintenance
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5">
                    Room {room.roomNumber} · Floor {room.floorNumber}
                  </Text>
                </View>
              </View>

              {/* Maintenance Note Card */}
              <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Issue / Note
                </Text>
                <Text className="text-sm font-semibold text-slate-800">
                  {bed.maintenanceNote || 'Scheduled for repair / plumbing / electrical fix.'}
                </Text>
              </View>

              {/* Mark as Available Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() => onMarkAvailable(bed._id)}
                className="w-full bg-[#0A6C50] rounded-2xl py-4 flex-row items-center justify-center shadow-sm"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
                    <Text className="text-base font-extrabold text-white ml-2.5">
                      Mark as available
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
