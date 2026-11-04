import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { X, ExternalLink, ShieldCheck, FileText } from 'lucide-react-native';

interface IdDocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  documentUrl?: string | null;
  tenantName?: string;
  docType?: string;
  maskedNumber?: string;
}

export const IdDocumentViewerModal: React.FC<IdDocumentViewerModalProps> = ({
  visible,
  onClose,
  documentUrl,
  tenantName = 'Tenant',
  docType = 'Aadhaar Card',
  maskedNumber,
}) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!visible) return null;

  const handleOpenExternal = async () => {
    if (!documentUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(documentUrl);
      if (canOpen) {
        await Linking.openURL(documentUrl);
      } else {
        Alert.alert('Unable to open link', 'No compatible app found to open this document.');
      }
    } catch (_err) {
      Alert.alert('Error', 'Could not open document link.');
    }
  };

  const isCloudinary = documentUrl?.includes('cloudinary.com');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/85 justify-center items-center px-4 py-8">
        {/* Card Container */}
        <View className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex-1 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <ShieldCheck size={18} color="#0A6C50" />
                <Text className="text-base font-black text-slate-900 ml-1.5 capitalize">
                  {docType} ID Proof
                </Text>
              </View>
              <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                {tenantName} {maskedNumber ? `· ${maskedNumber}` : ''}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/80 items-center justify-center"
            >
              <X size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Cloudinary Security Pill */}
          {isCloudinary && (
            <View className="bg-emerald-50 px-4 py-2 flex-row items-center justify-between border-b border-emerald-100">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-xs font-bold text-emerald-800">
                  Cloudinary Verified Storage
                </Text>
              </View>
              <Text className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                HTTPS CDN
              </Text>
            </View>
          )}

          {/* Image View Area */}
          <View className="flex-1 bg-slate-900 items-center justify-center relative p-2">
            {documentUrl ? (
              <>
                <Image
                  source={{ uri: documentUrl }}
                  className="w-full h-full"
                  resizeMode="contain"
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setHasError(true);
                  }}
                />

                {loading && (
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-xs font-bold text-white mt-2">Loading document...</Text>
                  </View>
                )}

                {hasError && (
                  <View className="absolute inset-0 items-center justify-center bg-slate-900 px-6">
                    <FileText size={48} color="#94A3B8" />
                    <Text className="text-sm font-bold text-white mt-3 text-center">
                      Unable to display image preview
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1 text-center">
                      Tap 'Open in Browser' below to view or download the original file.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="items-center justify-center px-6">
                <FileText size={48} color="#94A3B8" />
                <Text className="text-sm font-bold text-white mt-3 text-center">
                  No document URL available
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View className="p-4 bg-white border-t border-slate-100 flex-row gap-3">
            {documentUrl && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenExternal}
                className="flex-1 bg-slate-100 border border-slate-200 py-3.5 px-4 rounded-2xl flex-row items-center justify-center"
              >
                <ExternalLink size={16} color="#0A6C50" />
                <Text className="text-sm font-bold text-[#0A6C50] ml-2">Open in Browser</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              className="flex-1 bg-[#0A6C50] py-3.5 px-4 rounded-2xl items-center justify-center shadow-sm"
            >
              <Text className="text-sm font-extrabold text-white">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
