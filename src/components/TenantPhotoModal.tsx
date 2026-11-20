import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface TenantPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoSelected: (uri: string) => void | Promise<void>;
  onPhotoRemoved?: () => void | Promise<void>;
  hasExistingPhoto?: boolean;
  title?: string;
  subtitle?: string;
}

const MAX_ALLOWED_BYTES = 2 * 1024 * 1024; // 2MB

export const TenantPhotoModal: React.FC<TenantPhotoModalProps> = ({
  visible,
  onClose,
  onPhotoSelected,
  onPhotoRemoved,
  hasExistingPhoto = false,
  title = 'Tenant Profile Photo',
  subtitle = 'Take a portrait photo or choose from gallery (Max 2MB)',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!visible) return null;

  const compressImageIfNeeded = async (uri: string): Promise<string> => {
    let currentUri = uri;

    // Pass 1: Standard high-quality resize to 720px width @ 0.75 quality
    try {
      const manip1 = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 720 } }], {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (manip1?.uri) {
        currentUri = manip1.uri;
      }
    } catch {
      // Fallback to original uri
    }

    // Check size with FileSystem
    try {
      const info1 = await FileSystem.getInfoAsync(currentUri);
      if (info1.exists && typeof info1.size === 'number' && info1.size > MAX_ALLOWED_BYTES) {
        // Pass 2: More aggressive compression 500px width @ 0.6 quality
        const manip2 = await ImageManipulator.manipulateAsync(
          currentUri,
          [{ resize: { width: 500 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
        );
        if (manip2?.uri) {
          currentUri = manip2.uri;
        }

        const info2 = await FileSystem.getInfoAsync(currentUri);
        if (info2.exists && typeof info2.size === 'number' && info2.size > MAX_ALLOWED_BYTES) {
          // Pass 3: Maximum compression 350px width @ 0.45 quality
          const manip3 = await ImageManipulator.manipulateAsync(
            currentUri,
            [{ resize: { width: 350 } }],
            { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
          );
          if (manip3?.uri) {
            currentUri = manip3.uri;
          }

          const info3 = await FileSystem.getInfoAsync(currentUri);
          if (info3.exists && typeof info3.size === 'number' && info3.size > MAX_ALLOWED_BYTES) {
            throw new Error(
              `Photo file size (${(info3.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 2MB limit. Please select a smaller photo.`,
            );
          }
        }
      }
    } catch (sizeErr) {
      if (sizeErr instanceof Error && sizeErr.message.includes('2MB limit')) {
        throw sizeErr;
      }
    }

    return currentUri;
  };

  const processAndSelect = async (uri: string) => {
    try {
      setIsProcessing(true);
      const finalUri = await compressImageIfNeeded(uri);
      await onPhotoSelected(finalUri);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process photo. Please try again.';
      Alert.alert('Photo Size Error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is required to capture a tenant photo.',
            [
              { text: 'Choose from Gallery', onPress: handleLaunchGallery },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndSelect(result.assets[0].uri);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please choose from gallery.';
      Alert.alert('Camera Error', 'Could not launch camera: ' + msg);
    }
  };

  const handleLaunchGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Gallery Permission Required',
            'Photo library access is needed to select a tenant photo.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndSelect(result.assets[0].uri);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not open image library.';
      Alert.alert('Gallery Error', msg);
    }
  };

  const handleRemove = async () => {
    if (onPhotoRemoved) {
      setIsProcessing(true);
      try {
        await onPhotoRemoved();
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not remove photo.';
        Alert.alert('Error', msg);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* Handlebar */}
              <View style={styles.handlebarContainer}>
                <View style={styles.handlebar} />
              </View>

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={isProcessing}
                >
                  <X size={18} color="#0C192B" />
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              {isProcessing ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#4F5330" />
                  <Text
                    style={{ fontSize: 13, color: '#657080', marginTop: 12, fontWeight: '600' }}
                  >
                    Optimizing portrait photo (under 2MB)...
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {/* Take Photo with Camera */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleLaunchCamera}
                    style={styles.optionRow}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: '#FAF5EB', borderWidth: 1, borderColor: '#E5DDCD' },
                      ]}
                    >
                      <Camera size={20} color="#4F5330" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>Take Photo</Text>
                      <Text style={styles.optionSub}>Open device camera to capture new photo</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Choose from Gallery */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleLaunchGallery}
                    style={styles.optionRow}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: '#FAF5EB', borderWidth: 1, borderColor: '#E5DDCD' },
                      ]}
                    >
                      <ImageIcon size={20} color="#4F5330" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>Choose from Gallery</Text>
                      <Text style={styles.optionSub}>
                        Select an existing portrait from your photos
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Remove Photo (if applicable) */}
                  {hasExistingPhoto && onPhotoRemoved && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleRemove}
                      style={[
                        styles.optionRow,
                        { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
                      ]}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Trash2 size={20} color="#DC2626" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionTitle, { color: '#DC2626' }]}>Remove Photo</Text>
                        <Text style={[styles.optionSub, { color: '#EF4444' }]}>
                          Revert to default gender avatar
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                disabled={isProcessing}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 25, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: '#E5DDCD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  handlebarContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handlebar: {
    width: 44,
    height: 4,
    borderRadius: 9999,
    backgroundColor: '#E5DDCD',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0C192B',
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#657080',
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EB',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  optionRow: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0C192B',
  },
  optionSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#657080',
    marginTop: 2,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: '#FAF5EB',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#657080',
  },
});
