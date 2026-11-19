import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { MessageSquare, X, LogOut, Clock } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixBed, IMatrixRoom } from '../types/api';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { sendRentReminder } from '../utils/whatsapp';
import { setTenantNoticeApi, cancelTenantNoticeApi } from '../api/notice';
import { ConfirmActionModal } from './ConfirmDeleteModal';
import { SuccessActionModal } from './SuccessActionModal';
import { getTenantAvatar } from '../utils/assetImages';

interface OccupiedBedSheetProps {
  visible: boolean;
  onClose: () => void;
  bed: IMatrixBed | null;
  room: IMatrixRoom | null;
  upiVpa?: string;
  onViewProfile: (tenantId: string) => void;
  onCheckout?: (tenantId: string) => void;
}

export const OccupiedBedSheet: React.FC<OccupiedBedSheetProps> = ({
  visible,
  onClose,
  bed,
  room,
  upiVpa = '',
  onViewProfile,
  onCheckout,
}) => {
  const queryClient = useQueryClient();
  const [isUpdatingNotice, setIsUpdatingNotice] = useState(false);
  const [showNoticeConfirm, setShowNoticeConfirm] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState<{
    title: string;
    message: string;
    highlightCard?: {
      icon?: React.ReactNode;
      title: string;
      subtitle?: string;
    };
  } | null>(null);

  if (!bed || !room || !bed.currentTenant) return null;

  const tenant = bed.currentTenant;

  const isDue = tenant.paymentStatus === 'DUE' || (tenant.rentDuePaise && tenant.rentDuePaise > 0);
  const overdueText = tenant.overdueDays ? ` · ${tenant.overdueDays}d overdue` : '';
  const isOnNotice = bed.status === 'notice_period';

  const joinedDisplay = tenant.joinedDate ? formatSafeDate(tenant.joinedDate) : 'Active Tenant';

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

  const handleToggleNotice = async () => {
    if (!tenant._id) return;
    setIsUpdatingNotice(true);
    try {
      if (isOnNotice) {
        await cancelTenantNoticeApi(tenant._id);
        queryClient.invalidateQueries({ queryKey: ['matrix'] });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenant._id] });
        queryClient.invalidateQueries({ queryKey: ['tenant', tenant._id] });
        setShowNoticeConfirm(false);
        setNoticeSuccess({
          title: 'Notice Period Cancelled',
          message: `Notice period has been cancelled for ${tenant.fullName}. Bed ${bed.bedNumber} is restored to active status.`,
          highlightCard: {
            icon: <Clock size={16} color="#15803D" />,
            title: `${tenant.fullName} · Bed ${bed.bedNumber}`,
            subtitle: 'Active Occupancy Restored',
          },
        });
      } else {
        const vacateDate = new Date();
        vacateDate.setDate(vacateDate.getDate() + 30);
        await setTenantNoticeApi(tenant._id, {
          expectedVacateDate: vacateDate.toISOString(),
          notes: 'Standard 30-day notice period',
        });
        queryClient.invalidateQueries({ queryKey: ['matrix'] });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenant._id] });
        queryClient.invalidateQueries({ queryKey: ['tenant', tenant._id] });
        setShowNoticeConfirm(false);
        setNoticeSuccess({
          title: 'Notice Period Set!',
          message: `${tenant.fullName} is now on a 30-day notice period. Bed ${bed.bedNumber} is marked on Notice.`,
          highlightCard: {
            icon: <Clock size={16} color="#B45309" />,
            title: `30 Days Notice · Bed ${bed.bedNumber}`,
            subtitle: `Vacate Date: ${formatSafeDate(vacateDate)}`,
          },
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update notice period status.');
      Alert.alert('Notice Error', msg);
    } finally {
      setIsUpdatingNotice(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* Top Handle and Cancel/Close Header */}
              <View style={styles.headerBar}>
                <View style={{ width: 32 }} />
                <View style={styles.dragHandle} />
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={styles.closeButton}
                  accessibilityLabel="Close"
                >
                  <X size={16} color="#657080" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Tenant Header Row matching App Colors */}
              <View style={styles.tenantHeaderRow}>
                <View style={styles.avatar}>
                  <Image
                    source={getTenantAvatar(tenant)}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.tenantName} numberOfLines={1}>
                    {tenant.fullName}
                  </Text>
                  <Text style={styles.tenantSubtitle} numberOfLines={1}>
                    Bed {bed.bedNumber} · Room {room.roomNumber} · Floor {room.floorNumber}
                    {room.sharingType ? ` · ${room.sharingType} share` : ''}
                  </Text>
                </View>

                {/* Status Badges */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isDue ? '#FEF2F2' : '#F0FDF4',
                        borderColor: isDue ? '#FECACA' : '#BBF7D0',
                      },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: isDue ? '#DC2626' : '#15803D' }]}>
                      {isDue ? 'DUE' : 'PAID'}
                    </Text>
                  </View>

                  {isOnNotice && (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>ON NOTICE</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Info Table in Warm Card Surface */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Monthly rent</Text>
                  <Text style={styles.infoValue}>
                    {formatINR(tenant.monthlyRentPaise || bed.baseRentPaise)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rent status</Text>
                  <Text style={[styles.infoValue, { color: isDue ? '#DC2626' : '#15803D' }]}>
                    {isDue
                      ? `${formatINR(tenant.rentDuePaise || tenant.monthlyRentPaise || bed.baseRentPaise)}${overdueText}`
                      : 'Paid on time'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.infoLabel}>Joined date</Text>
                  <Text style={styles.infoValue}>{joinedDisplay}</Text>
                </View>
              </View>

              {/* Actions Row: WhatsApp Quick Sender + View Profile */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleWhatsApp}
                  style={styles.whatsAppButton}
                  accessibilityLabel="Send WhatsApp reminder"
                >
                  <MessageSquare size={20} color="#25D366" strokeWidth={2.3} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose();
                    onViewProfile(tenant._id);
                  }}
                  style={styles.viewProfileButton}
                >
                  <Text style={styles.viewProfileButtonText}>View dues & profile</Text>
                </TouchableOpacity>
              </View>

              {/* Notice Period Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isUpdatingNotice}
                onPress={() => setShowNoticeConfirm(true)}
                style={[
                  styles.noticeButton,
                  {
                    backgroundColor: isOnNotice ? '#FEF3C7' : '#FAF5EB',
                    borderColor: isOnNotice ? '#FDE047' : '#E5DDCD',
                  },
                ]}
              >
                {isUpdatingNotice ? (
                  <ActivityIndicator size="small" color="#B45309" />
                ) : (
                  <>
                    <Clock size={16} color={isOnNotice ? '#B45309' : '#4F5330'} strokeWidth={2.2} />
                    <Text
                      style={[
                        styles.noticeButtonText,
                        { color: isOnNotice ? '#92400E' : '#4F5330' },
                      ]}
                    >
                      {isOnNotice
                        ? 'Cancel Notice Period (Restore Bed)'
                        : 'Mark Notice Period (30 Days)'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Checkout / Vacate Button */}
              {onCheckout && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    onCheckout(tenant._id);
                  }}
                  style={styles.checkoutButton}
                >
                  <LogOut size={16} color="#BE123C" strokeWidth={2.2} />
                  <Text style={styles.checkoutButtonText}>Checkout / Vacate Bed</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Notice Period Confirmation Modal */}
      <ConfirmActionModal
        visible={showNoticeConfirm}
        onClose={() => setShowNoticeConfirm(false)}
        onConfirm={handleToggleNotice}
        isLoading={isUpdatingNotice}
        variant="warning"
        icon={<Clock size={28} color="#D97706" strokeWidth={2.3} />}
        title={isOnNotice ? 'Cancel Notice Period?' : 'Start Notice Period?'}
        message={
          isOnNotice
            ? `Remove notice period for ${tenant.fullName}? The bed status will return to occupied.`
            : `Put ${tenant.fullName} on a 30-day notice period? Bed ${bed.bedNumber} will be marked on Notice.`
        }
        confirmLabel={isOnNotice ? 'Restore Bed' : 'Mark Notice (30 Days)'}
      />

      {/* Notice Action Success Feedback Modal */}
      <SuccessActionModal
        visible={!!noticeSuccess}
        onClose={() => {
          setNoticeSuccess(null);
          onClose();
        }}
        title={noticeSuccess?.title || ''}
        message={noticeSuccess?.message || ''}
        highlightCard={noticeSuccess?.highlightCard}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 25, 43, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E5DDCD',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0D7B4',
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
  tenantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF5EB',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0799AA',
  },
  tenantName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0C192B',
    letterSpacing: -0.2,
  },
  tenantSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#657080',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  noticeBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE047',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noticeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  infoCard: {
    backgroundColor: '#FAF5EB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5DDCD',
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDCD',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#657080',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C192B',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  whatsAppButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FAF5EB',
    borderWidth: 1,
    borderColor: '#E5DDCD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileButton: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#4F5330',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F5330',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noticeButton: {
    width: '100%',
    height: 48,
    borderRadius: 9999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  noticeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutButton: {
    width: '100%',
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
  },
});
