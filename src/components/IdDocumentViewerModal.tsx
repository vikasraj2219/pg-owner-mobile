import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { ArrowLeft, ExternalLink, ShieldCheck, FileText, Share2 } from 'lucide-react-native';

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

  const isWebUrl = documentUrl?.startsWith('http://') || documentUrl?.startsWith('https://');
  const isCloudinary = documentUrl?.includes('cloudinary.com');

  useEffect(() => {
    if (visible && documentUrl) {
      setLoading(true);
      setHasError(false);

      // If document is a base64 data URI or local file, prevent spinner from sticking
      if (documentUrl.startsWith('data:') || documentUrl.startsWith('file:')) {
        const timer = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, documentUrl]);

  if (!visible) return null;

  const handleShareOrOpen = async () => {
    if (!documentUrl) return;
    try {
      if (isWebUrl) {
        const canOpen = await Linking.canOpenURL(documentUrl);
        if (canOpen) {
          await Linking.openURL(documentUrl);
          return;
        }
      }

      await Share.share({
        title: `${tenantName} - ${docType} ID Proof`,
        message: isWebUrl ? documentUrl : `ID Document for ${tenantName} (${docType})`,
      });
    } catch (_err) {
      Alert.alert('Notice', 'Unable to open or share this document.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(12, 25, 43, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 32,
        }}
      >
        {/* Card Container */}
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: '#FAF5EB',
            borderRadius: 24,
            overflow: 'hidden',
            flex: 1,
            maxHeight: '88%',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DDCD',
              backgroundColor: '#FAF5EB',
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck size={16} color="#4F5330" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: '#0C192B',
                    marginLeft: 6,
                    textTransform: 'capitalize',
                  }}
                  numberOfLines={1}
                >
                  {docType} ID Proof
                </Text>
              </View>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                numberOfLines={1}
              >
                {tenantName} {maskedNumber ? `· ${maskedNumber}` : ''}
              </Text>
            </View>

            {documentUrl ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleShareOrOpen}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Share"
              >
                <Share2 size={18} color="#4F5330" strokeWidth={2.3} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Cloudinary Security Pill */}
          {isCloudinary && (
            <View
              style={{
                backgroundColor: '#E8F5E9',
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: '#C8E6C9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#2E7D32',
                    marginRight: 8,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>
                  Cloudinary Verified Storage
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: '#2E7D32',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                HTTPS CDN
              </Text>
            </View>
          )}

          {/* Image View Area with App Palette */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#F5EFE0',
              margin: 14,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            {documentUrl ? (
              <>
                <Image
                  source={{ uri: documentUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  onLoad={() => setLoading(false)}
                  onLoadStart={() => {
                    if (!documentUrl.startsWith('data:') && !documentUrl.startsWith('file:')) {
                      setLoading(true);
                    }
                  }}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setHasError(true);
                  }}
                />

                {loading && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(250, 245, 235, 0.9)',
                    }}
                  >
                    <ActivityIndicator size="large" color="#4F5330" />
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginTop: 8 }}
                    >
                      Loading document...
                    </Text>
                  </View>
                )}

                {hasError && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 24,
                      backgroundColor: '#FAF5EB',
                    }}
                  >
                    <FileText size={48} color="#657080" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0C192B',
                        marginTop: 12,
                        textAlign: 'center',
                      }}
                    >
                      Unable to display image preview
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#657080',
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                    >
                      Tap below to view or export the document.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View
                style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
              >
                <FileText size={48} color="#657080" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#0C192B',
                    marginTop: 12,
                    textAlign: 'center',
                  }}
                >
                  No document URL available
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View
            style={{
              padding: 16,
              backgroundColor: '#FAF5EB',
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
              flexDirection: 'row',
              gap: 12,
            }}
          >
            {documentUrl && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleShareOrOpen}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  height: 48,
                  borderRadius: 9999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isWebUrl ? (
                  <ExternalLink size={16} color="#0C192B" />
                ) : (
                  <Share2 size={16} color="#0C192B" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B', marginLeft: 8 }}>
                  {isWebUrl ? 'Open in Browser' : 'Share / Export'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: '#4F5330',
                height: 48,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
