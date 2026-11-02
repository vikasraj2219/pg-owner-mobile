import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { X, Share2, Check } from 'lucide-react-native';
import { formatINR } from '../utils/currency';

interface DynamicUpiQrModalProps {
  visible: boolean;
  onClose: () => void;
  upiVpa: string;
  amountPaise: number;
  tenantName: string;
  depositPaise?: number;
  rentPaise?: number;
  onMarkReceived?: () => void;
}

export const DynamicUpiQrModal: React.FC<DynamicUpiQrModalProps> = ({
  visible,
  onClose,
  upiVpa,
  amountPaise,
  tenantName,
  depositPaise = 0,
  rentPaise = 0,
  onMarkReceived,
}) => {
  const amountRupees = (amountPaise / 100).toFixed(2);
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(
    'PG Manager',
  )}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(`Advance rent ${tenantName}`)}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Please pay ₹${amountRupees} for PG advance to UPI ID: ${upiVpa}\n\nPayment Link: ${upiPayload}`,
      });
    } catch (_err) {
      Alert.alert('Error', 'Unable to share payment request.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl p-6 pt-4 pb-10">
              {/* Handle */}
              <View className="items-center mb-3">
                <View className="w-12 h-1.5 rounded-full bg-slate-300" />
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                className="absolute top-4 right-5 w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Header */}
              <Text className="text-sm font-semibold text-slate-500 text-center">
                Collect advance from {tenantName || 'Tenant'}
              </Text>
              <Text className="text-3xl font-black text-[#0A6C50] text-center mt-1">
                {formatINR(amountPaise)}
              </Text>

              {/* Deposit + Rent breakdown matching Page 20 */}
              {(depositPaise > 0 || rentPaise > 0) && (
                <Text className="text-xs font-medium text-slate-400 text-center mt-1">
                  Deposit {formatINR(depositPaise)} + first rent {formatINR(rentPaise)}
                </Text>
              )}

              {/* UPI ID pill */}
              <View className="self-center bg-slate-100 px-3.5 py-1.5 rounded-full mt-3 mb-5">
                <Text className="text-xs font-bold text-slate-700 tracking-wide">{upiVpa}</Text>
              </View>

              {/* QR Code container matching Page 20 */}
              <View className="items-center justify-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs self-center mb-4">
                <QRCode value={upiPayload} size={200} backgroundColor="#FFFFFF" />
              </View>

              <Text className="text-xs font-semibold text-slate-400 text-center mb-6">
                Scan with GPay, PhonePe or Paytm
              </Text>

              {/* Action Buttons matching Page 20 */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleShare}
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl flex-row items-center justify-center"
                >
                  <Share2 size={18} color="#334155" />
                  <Text className="text-sm font-bold text-slate-700 ml-2">Share QR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onMarkReceived) onMarkReceived();
                    onClose();
                  }}
                  className="flex-1 py-3.5 bg-[#0A6C50] rounded-xl flex-row items-center justify-center"
                >
                  <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text className="text-sm font-bold text-white ml-2">Mark received</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
