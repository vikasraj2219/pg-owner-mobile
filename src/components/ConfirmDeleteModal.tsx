import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react-native';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success';

export interface ConfirmDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  requiresInput?: string; // If set, user must type this exact string to confirm
  inputPlaceholder?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  requiresInput,
  inputPlaceholder,
  variant = 'danger',
  icon,
}) => {
  const [typedInput, setTypedInput] = useState('');

  useEffect(() => {
    if (visible) {
      setTypedInput('');
    }
  }, [visible]);

  if (!visible) return null;

  const isInputValid =
    !requiresInput || typedInput.trim().toLowerCase() === requiresInput.trim().toLowerCase();

  // Style configurations based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          badgeBg: 'bg-amber-100 border border-amber-200',
          defaultIcon: <AlertTriangle size={28} color="#D97706" strokeWidth={2.3} />,
          buttonBg: 'bg-amber-600',
          buttonDisabledBg: 'bg-amber-300',
        };
      case 'primary':
        return {
          badgeBg: 'bg-[#E8F5EE] border border-[#A7F3D0]',
          defaultIcon: <CheckCircle2 size={28} color="#0A6C50" strokeWidth={2.3} />,
          buttonBg: 'bg-[#0A6C50]',
          buttonDisabledBg: 'bg-[#0A6C50]/50',
        };
      case 'success':
        return {
          badgeBg: 'bg-emerald-100 border border-emerald-200',
          defaultIcon: <CheckCircle2 size={28} color="#059669" strokeWidth={2.3} />,
          buttonBg: 'bg-emerald-600',
          buttonDisabledBg: 'bg-emerald-300',
        };
      case 'danger':
      default:
        return {
          badgeBg: 'bg-rose-100 border border-rose-200',
          defaultIcon: <Trash2 size={28} color="#BE123C" strokeWidth={2.3} />,
          buttonBg: 'bg-rose-600',
          buttonDisabledBg: 'bg-rose-300',
        };
    }
  };

  const currentVariant = getVariantStyles();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
              {/* Close (X) button at top right */}
              {!isLoading && (
                <TouchableOpacity
                  onPress={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              )}

              {/* Status / Action Icon Badge */}
              <View
                className={`w-16 h-16 rounded-full items-center justify-center mx-auto mb-4 ${currentVariant.badgeBg}`}
              >
                {icon || currentVariant.defaultIcon}
              </View>

              {/* Title */}
              <Text className="text-xl font-black text-slate-900 text-center mb-2">{title}</Text>

              {/* Message */}
              <Text className="text-sm font-medium text-slate-600 text-center mb-5 leading-relaxed">
                {message}
              </Text>

              {/* Optional Name Confirmation Input */}
              {requiresInput && (
                <View className="mb-5">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Type &quot;{requiresInput}&quot; to confirm:
                  </Text>
                  <TextInput
                    value={typedInput}
                    onChangeText={setTypedInput}
                    placeholder={inputPlaceholder || requiresInput}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm"
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center"
                >
                  <Text className="text-sm font-bold text-slate-700">{cancelLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onConfirm}
                  disabled={isLoading || !isInputValid}
                  className={`flex-1 py-3.5 rounded-2xl items-center justify-center shadow-xs ${
                    isInputValid ? currentVariant.buttonBg : currentVariant.buttonDisabledBg
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-sm font-extrabold text-white">{confirmLabel}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const ConfirmActionModal = ConfirmDeleteModal;
