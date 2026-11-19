import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';

export interface SuccessActionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonLabel?: string;
  highlightCard?: {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
  };
}

/**
 * Standard In-App Success Modal matching Nilaaya design language:
 * Warm card surface (#FFFDF8), emerald badge, bold navy typography,
 * olive primary button (#4F5330), and signature decorative wave footer.
 */
export const SuccessActionModal: React.FC<SuccessActionModalProps> = ({
  visible,
  onClose,
  title,
  message,
  buttonLabel = 'Done',
  highlightCard,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.container}>
              {/* Header Icon & Close Button */}
              <View style={styles.headerRow}>
                <View style={styles.iconBadge}>
                  <CheckCircle2 size={26} color="#059669" strokeWidth={2.4} />
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.closeButton}
                  accessibilityLabel="Close"
                >
                  <X size={16} color="#657080" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message Description */}
              <Text style={styles.message}>{message}</Text>

              {/* Optional Highlight Card */}
              {highlightCard && (
                <View style={styles.highlightCard}>
                  {highlightCard.icon && (
                    <View style={styles.highlightIconContainer}>{highlightCard.icon}</View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.highlightTitle}>{highlightCard.title}</Text>
                    {highlightCard.subtitle && (
                      <Text style={styles.highlightSubtitle}>{highlightCard.subtitle}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
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
    backgroundColor: 'rgba(12, 25, 43, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFDF8',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5DDCD',
    padding: 22,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E6F7F2',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EB',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0C192B',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  highlightCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  highlightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  highlightSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    marginTop: 1,
  },
  primaryButton: {
    backgroundColor: '#4F5330',
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F5330',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
