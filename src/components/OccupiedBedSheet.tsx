import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { MessageSquare, X } from 'lucide-react-native';
import { IMatrixBed, IMatrixRoom } from '../types/api';
import { formatINR } from '../utils/currency';
import { sendRentReminder } from '../utils/whatsapp';

interface OccupiedBedSheetProps {
  visible: boolean;
  onClose: () => void;
  bed: IMatrixBed | null;
  room: IMatrixRoom | null;
  upiVpa?: string;
  onViewProfile: (tenantId: string) => void;
}

export const OccupiedBedSheet: React.FC<OccupiedBedSheetProps> = ({
  visible,
  onClose,
  bed,
  room,
  upiVpa = '',
  onViewProfile,
}) => {
  if (!bed || !room || !bed.currentTenant) return null;

  const tenant = bed.currentTenant;
  const initials = tenant.fullName
    ? tenant.fullName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TN';

  const isDue = tenant.paymentStatus === 'DUE' || (tenant.rentDuePaise && tenant.rentDuePaise > 0);
  const overdueText = tenant.overdueDays ? ` · ${tenant.overdueDays} days overdue` : '';

  const handleWhatsApp = () => {
    if (tenant.phone) {
      sendRentReminder(
        tenant.phone,
        tenant.fullName,
        bed.bedNumber,
        tenant.monthlyRentPaise || bed.baseRentPaise,
        upiVpa,
      );
    }
  };

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

              {/* Tenant Header Row */}
              <View className="flex-row items-center mb-5">
                <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mr-3.5">
                  <Text className="text-base font-extrabold text-slate-700">{initials}</Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-lg font-extrabold text-slate-900">{tenant.fullName}</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5">
                    Bed {bed.bedNumber} · Room {room.roomNumber} · Floor {room.floorNumber}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-md ${
                    isDue
                      ? 'bg-[#FFF1F2] border border-[#FECDD3]'
                      : 'bg-[#F0FDF4] border border-[#86EFAC]'
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${isDue ? 'text-[#991B1B]' : 'text-[#0A6C50]'}`}
                  >
                    {isDue ? 'DUE' : 'PAID'}
                  </Text>
                </View>
              </View>

              {/* Info Table */}
              <View className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <View className="flex-row items-center justify-between py-2 border-b border-slate-200/60">
                  <Text className="text-sm text-slate-500 font-medium">Monthly rent</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {formatINR(tenant.monthlyRentPaise || bed.baseRentPaise)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2 border-b border-slate-200/60">
                  <Text className="text-sm text-slate-500 font-medium">Rent due</Text>
                  <Text
                    className={`text-sm font-bold ${isDue ? 'text-rose-600' : 'text-emerald-700'}`}
                  >
                    {isDue
                      ? `${formatINR(tenant.rentDuePaise || tenant.monthlyRentPaise || bed.baseRentPaise)}${overdueText}`
                      : '₹0 · Paid on time'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-sm text-slate-500 font-medium">Joined</Text>
                  <Text className="text-sm font-bold text-slate-900">
                    {tenant.joinedDate || '12 Jun 2026'}
                  </Text>
                </View>
              </View>

              {/* Actions Row */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleWhatsApp}
                  className="w-14 h-14 rounded-2xl border border-slate-300 items-center justify-center bg-white"
                >
                  <MessageSquare size={22} color="#0A6C50" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    onViewProfile(tenant._id);
                  }}
                  className="flex-1 bg-[#0A6C50] rounded-2xl py-4 items-center justify-center shadow-sm"
                >
                  <Text className="text-base font-extrabold text-white">View profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
