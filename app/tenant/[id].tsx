import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Edit2,
  MoreVertical,
  Phone,
  MessageSquare,
  ShieldCheck,
  Camera,
  AlertTriangle,
  Clock,
  Trash2,
  Receipt,
  User,
  Eye,
  ImageIcon,
  Calendar,
  Wallet,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQueryClient } from '@tanstack/react-query';
import { uploadKycDocumentApi } from '../../src/api/upload';
import { IdDocumentViewerModal } from '../../src/components/IdDocumentViewerModal';
import { useTenantDetail } from '../../src/hooks/useTenants';
import { useMatrix } from '../../src/hooks/useMatrix';
import { formatINR } from '../../src/utils/currency';
import { formatSafeDate, formatDayMonth, formatSafeMonthYear } from '../../src/utils/date';
import { openWhatsApp } from '../../src/utils/whatsapp';
import { resolveRoomAndBed } from '../../src/utils/bedResolution';
import { RecordPaymentModal } from '../../src/components/RecordPaymentModal';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { markInvoicePaidApi } from '../../src/api/invoices';
import {
  deleteTenantApi,
  setTenantNoticeApi,
  cancelTenantNoticeApi,
  updateTenantApi,
} from '../../src/api/tenants';
import { DueInvoiceItem, MarkPaidResponseData } from '../../src/types/api';
import { generateAndShareReceipt } from '../../src/utils/pdfReceipt';

type DetailTab = 'overview' | 'payments' | 'id_proof';

export default function TenantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<DueInvoiceItem | null>(
    null,
  );
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Notice period modal state
  const [noticeModal, setNoticeModal] = useState({
    visible: false,
    days: 30,
    notes: '',
    isSubmitting: false,
  });

  // Delete modals
  const [cantDeleteModal, setCantDeleteModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // ID Document Viewer state
  const [showIdDocViewer, setShowIdDocViewer] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [isReplacingPhoto, setIsReplacingPhoto] = useState(false);

  // Fetch tenant details
  const { tenant, invoices, deposits, payments, balanceDuePaise, isLoading, refetch } =
    useTenantDetail(id);

  const propertyId =
    typeof tenant?.property === 'object' && tenant?.property
      ? (tenant.property as any)._id
      : tenant?.property;
  const { matrixData } = useMatrix(propertyId || null);

  // Initials generator
  const getInitials = (name?: string) => {
    if (!name) return 'TN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const bedInfo = useMemo(() => {
    const resolved = resolveRoomAndBed({
      tenantId: tenant?._id,
      tenantName: tenant?.fullName,
      currentBed: tenant?.currentBed,
      matrixData,
    });
    return {
      bedNumber: resolved.bedNumber,
      roomNumber: resolved.roomNumber,
      formattedLabel: resolved.formattedLabel,
      floorNumber:
        typeof tenant?.currentBed === 'object' &&
        tenant?.currentBed?.room?.floorNumber !== undefined
          ? String(tenant.currentBed.room.floorNumber)
          : 'N/A',
    };
  }, [tenant, matrixData]);

  // Find overdue / pending invoice
  const overdueInvoice = useMemo(() => {
    return invoices.find(inv => inv.status !== 'paid' && (inv.balanceDuePaise ?? 0) > 0);
  }, [invoices]);

  // Calculate days overdue
  const overdueDays = useMemo(() => {
    if (!overdueInvoice?.dueDate) return 0;
    const dueTime = new Date(overdueInvoice.dueDate).getTime();
    const nowTime = new Date().getTime();
    const diff = Math.floor((nowTime - dueTime) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [overdueInvoice]);

  // Combined payment ledger items
  const ledgerItems = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      mode: string;
      amountPaise: number;
      receiptNumber: string;
      type: 'payment' | 'deposit';
    }> = [];

    // Regular rent/bill payments
    payments.forEach(p => {
      items.push({
        id: p._id,
        date: p.paymentDate,
        mode: p.paymentMethod ? p.paymentMethod.toUpperCase() : 'UPI',
        amountPaise: p.amountPaidPaise,
        receiptNumber: p.receiptNumber,
        type: 'payment',
      });
    });

    // Deposit payments
    deposits.forEach(d => {
      items.push({
        id: d._id,
        date: d.date,
        mode: `${(d.paymentMethod || 'cash').toUpperCase()} · ${d.type}`,
        amountPaise: d.amountPaise,
        receiptNumber: `DEP-${d._id.slice(-6).toUpperCase()}`,
        type: 'deposit',
      });
    });

    // Sort descending by date
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, deposits]);

  // Call handler
  const handleCall = () => {
    if (!tenant?.phone) {
      Alert.alert('No Phone', 'Tenant phone number is not available.');
      return;
    }
    const cleanPhone = tenant.phone.replace(/[^0-9+]/g, '');
    void Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // WhatsApp handler
  const handleWhatsApp = () => {
    if (!tenant?.phone) return;
    if (balanceDuePaise > 0) {
      router.push({
        pathname: `/reminder/${tenant._id}`,
        params: {
          tenantName: tenant.fullName,
          phone: tenant.phone,
          bedNo: `Bed ${bedInfo.bedNumber}`,
          amountPaise: balanceDuePaise.toString(),
          overdueDays: (overdueDays > 0 ? overdueDays : 0).toString(),
          upiVpa: (typeof tenant.property === 'object' && tenant.property?.upiVpa) || '',
        },
      } as any);
    } else {
      void openWhatsApp(tenant.phone, `Hello ${tenant.fullName}!`);
    }
  };

  // Delete check
  const handleDeleteCheck = () => {
    setIsActionSheetVisible(false);
    if (!tenant) return;

    const isOccupied = tenant.status === 'active' || tenant.status === 'notice_period';
    const hasBed = Boolean(tenant.currentBed);
    const hasDues = (balanceDuePaise ?? 0) > 0;

    if (isOccupied || hasBed || hasDues) {
      setCantDeleteModal(true);
    } else {
      setConfirmDeleteModal(true);
    }
  };

  const handleExecuteDelete = async () => {
    if (!tenant) return;
    setConfirmDeleteModal(false);
    try {
      const res = await deleteTenantApi(tenant._id);
      if (res.canDelete) {
        Alert.alert('Deleted', `${tenant.fullName} has been removed.`);
        router.back();
      } else {
        Alert.alert('Cannot Delete', res.message);
      }
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.response?.data?.message || err.message);
    }
  };

  // Start notice submit
  const handleNoticeSubmit = async () => {
    if (!tenant) return;
    setNoticeModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const vacateDate = new Date();
      vacateDate.setDate(vacateDate.getDate() + noticeModal.days);

      await setTenantNoticeApi(tenant._id, {
        expectedVacateDate: vacateDate.toISOString(),
        notes: noticeModal.notes || `Vacate notice period of ${noticeModal.days} days`,
      });

      setNoticeModal({ visible: false, days: 30, notes: '', isSubmitting: false });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      void refetch();
      Alert.alert(
        'Notice Period Set',
        `${tenant.fullName} is now on ${noticeModal.days} days notice.`,
      );
      Alert.alert(
        'Notice Period Set',
        `${tenant.fullName} is now on ${noticeModal.days} days notice.`,
      );
    } catch (err: any) {
      setNoticeModal(prev => ({ ...prev, isSubmitting: false }));
      Alert.alert('Error', err?.response?.data?.message || 'Could not start notice period.');
    }
  };

  // Cancel notice
  const handleCancelNotice = async () => {
    if (!tenant) return;
    setIsActionSheetVisible(false);
    try {
      await cancelTenantNoticeApi(tenant._id);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      void refetch();
      Alert.alert('Notice Canceled', `Notice period removed for ${tenant.fullName}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not cancel notice period.');
    }
  };

  // Process & save ID document
  const processAndSaveKycPhoto = async (originalUri: string) => {
    if (!tenant) return;
    setIsReplacingPhoto(true);
    try {
      // Compress and generate persistent base64 data URI fallback
      let finalUrl = originalUri;
      try {
        const manip = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 800 } }],
          { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (manip.base64) {
          finalUrl = `data:image/jpeg;base64,${manip.base64}`;
        }
      } catch {
        // Keep originalUri if compression fails
      }

      try {
        const uploadRes = await uploadKycDocumentApi(
          originalUri,
          `${tenant.fullName.trim().replace(/\s+/g, '_')}_kyc.jpg`,
          'image/jpeg',
        );
        if (uploadRes?.secureUrl) {
          finalUrl = uploadRes.secureUrl;
        }
      } catch {
        // Keep finalUrl as base64 data URI
      }

      await updateTenantApi(tenant._id, {
        kycDocUrl: finalUrl,
      });

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      void refetch();
      Alert.alert('ID Proof Updated', 'ID proof document has been updated and saved successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Failed to update photo.');
    } finally {
      setIsReplacingPhoto(false);
    }
  };

  // Capture photo with camera
  const handleCaptureNewPhoto = async () => {
    setShowPhotoPickerModal(false);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is required to capture tenant ID proof. You can also pick from gallery.',
            [
              { text: 'Choose from Gallery', onPress: handlePickFromGallery },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await processAndSaveKycPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert(
        'Camera Error',
        'Could not open camera: ' + (err?.message || 'Please choose from gallery instead.'),
        [
          { text: 'Open Gallery', onPress: handlePickFromGallery },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  // Choose photo from gallery
  const handlePickFromGallery = async () => {
    setShowPhotoPickerModal(false);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Gallery access is required to update ID photo.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await processAndSaveKycPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Failed to select photo.');
    }
  };

  // Replace or Upload ID photo trigger
  const handleReplacePhoto = () => {
    setShowPhotoPickerModal(true);
  };

  // Record payment submit
  const handleRecordPayment = async (payload: {
    invoiceId: string;
    amountPaise: number;
    paymentMethod: 'cash' | 'upi' | 'bank_transfer';
    transactionReference?: string;
    notes?: string;
  }): Promise<MarkPaidResponseData> => {
    setIsPaymentSubmitting(true);
    try {
      const res = await markInvoicePaidApi({
        invoiceId: payload.invoiceId,
        amountPaise: payload.amountPaise,
        paymentMethod: payload.paymentMethod,
        transactionReference: payload.transactionReference,
        notes: payload.notes,
      });
      setSelectedInvoiceForPayment(null);
      void refetch();
      return res;
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // View Receipt on Screen
  const handleViewReceipt = (item: {
    receiptNumber: string;
    amountPaise: number;
    date: string;
    mode: string;
  }) => {
    if (!tenant) return;
    router.push({
      pathname: `/receipt/${item.receiptNumber}`,
      params: {
        receiptNo: item.receiptNumber,
        tenantName: tenant.fullName,
        bedNo: bedInfo.formattedLabel,
        propertyName: (typeof tenant.property === 'object' && tenant.property?.name) || 'PG',
        propertyAddress: (typeof tenant.property === 'object' && tenant.property?.address) || '',
        amountPaise: item.amountPaise.toString(),
        date: item.date,
        method: item.mode,
      },
    } as any);
  };

  // Share Receipt
  const _handleShareReceipt = async (item: {
    receiptNumber: string;
    amountPaise: number;
    date: string;
    mode: string;
  }) => {
    if (!tenant) return;
    try {
      await generateAndShareReceipt({
        receiptNo: item.receiptNumber,
        tenantName: tenant.fullName,
        bedNo: bedInfo.formattedLabel,
        property: (typeof tenant.property === 'object' && tenant.property?.name) || 'PG',
        amountPaise: item.amountPaise,
        date: formatSafeDate(item.date),
        paymentMethod: item.mode,
      });
    } catch {
      Alert.alert('Error', 'Unable to generate receipt PDF.');
    }
  };

  if (isLoading || !tenant) {
    return (
      <SafeAreaView
        edges={['top']}
        style={{
          flex: 1,
          backgroundColor: '#FAF5EB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#4F5330" />
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 8 }}>
          Loading tenant profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      {/* Top Header matching Edit Property / Add Room design */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={20} color="#0C192B" strokeWidth={2.3} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}>
            Tenant Details
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
            {tenant.fullName} · Bed {bedInfo.bedNumber}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/tenant/edit/${tenant._id}` as any)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Edit tenant"
          >
            <Edit2 size={18} color="#4F5330" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsActionSheetVisible(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="More options"
          >
            <MoreVertical size={18} color="#657080" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Initials Avatar */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#D1F4F9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0799AA' }}>
                {getInitials(tenant.fullName)}
              </Text>
            </View>

            {/* Name & Room Details */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', lineHeight: 26 }}>
                {tenant.fullName}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#657080', marginTop: 3 }}>
                Bed {bedInfo.bedNumber} · Room {bedInfo.roomNumber} · Floor {bedInfo.floorNumber}
              </Text>

              {/* Badges */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                {tenant.status === 'active' && (
                  <View
                    style={{
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                      Active
                    </Text>
                  </View>
                )}
                {tenant.status === 'notice_period' && (
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      borderWidth: 1,
                      borderColor: '#FDE047',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                      Notice
                    </Text>
                  </View>
                )}
                {tenant.status === 'checked_out' && (
                  <View
                    style={{
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#657080' }}>
                      Checked out
                    </Text>
                  </View>
                )}

                {/* Due badge */}
                {balanceDuePaise > 0 ? (
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#991B1B' }}>DUE</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>PAID</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Contact Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}>
            <TouchableOpacity
              onPress={handleCall}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                backgroundColor: '#FFFDF8',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Phone size={18} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 8 }}>
                Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#BBF7D0',
                backgroundColor: '#F0FDF4',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <MessageSquare size={18} color="#15803D" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803D', marginLeft: 8 }}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Tabs: Overview | Payments | ID proof */}
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            paddingHorizontal: 20,
            marginTop: 4,
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'overview' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: activeTab === 'overview' ? '#0C192B' : '#657080',
              }}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('payments')}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'payments' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: activeTab === 'payments' ? '#0C192B' : '#657080',
              }}
            >
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('id_proof')}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'id_proof' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: activeTab === 'id_proof' ? '#0C192B' : '#657080',
              }}
            >
              ID proof
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {/* 3 Metrics Cards matching Image 1 */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {/* Monthly Rent Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F0F9FF',
                  borderWidth: 1,
                  borderColor: '#E0F2FE',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color="#0284C7" strokeWidth={2.5} />
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', color: '#0C192B', marginLeft: 5 }}
                    numberOfLines={1}
                  >
                    Monthly Rent
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 17, fontWeight: '800', color: '#0C192B', marginTop: 8 }}
                  numberOfLines={1}
                >
                  {formatINR(tenant.monthlyRentPaise || 0)}
                </Text>
              </View>

              {/* Deposit Held Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#F0FDFA',
                  borderWidth: 1,
                  borderColor: '#CCFBF1',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Wallet size={14} color="#0891B2" strokeWidth={2.5} />
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', color: '#0C192B', marginLeft: 5 }}
                    numberOfLines={1}
                  >
                    Deposit Held
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 17, fontWeight: '800', color: '#0C192B', marginTop: 8 }}
                  numberOfLines={1}
                >
                  {formatINR(tenant.depositPaise || 0)}
                </Text>
              </View>

              {/* Balance Due Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: balanceDuePaise > 0 ? '#FEF2F2' : '#F0FDF4',
                  borderWidth: 1,
                  borderColor: balanceDuePaise > 0 ? '#FECACA' : '#DCFCE7',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle
                    size={14}
                    color={balanceDuePaise > 0 ? '#DC2626' : '#15803D'}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={{ fontSize: 11, fontWeight: '600', color: '#0C192B', marginLeft: 5 }}
                    numberOfLines={1}
                  >
                    Balance Due
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: balanceDuePaise > 0 ? '#DC2626' : '#15803D',
                    marginTop: 8,
                  }}
                  numberOfLines={1}
                >
                  {formatINR(balanceDuePaise)}
                </Text>
              </View>
            </View>

            {/* Details List Card */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#657080' }}>Phone</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  +91 {tenant.phone}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#657080' }}>
                  Emergency phone
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  {tenant.emergencyPhone ? `+91 ${tenant.emergencyPhone}` : 'Not provided'}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#657080' }}>Email</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  {tenant.email || 'Not provided'}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#657080' }}>Joined</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#657080' }}>Bed</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  {bedInfo.bedNumber} · Floor {bedInfo.floorNumber}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'payments' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {/* Overdue Card if has pending invoice */}
            {overdueInvoice && (
              <View
                style={{
                  backgroundColor: '#FFF1F2',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                    {formatSafeMonthYear(new Date(overdueInvoice.dueDate))} rent · due{' '}
                    {formatDayMonth(overdueInvoice.dueDate)}
                  </Text>
                  {overdueDays > 0 && (
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                      {overdueDays} days overdue
                    </Text>
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '900',
                    color: '#991B1B',
                    letterSpacing: -0.5,
                    marginBottom: 14,
                  }}
                >
                  {formatINR(overdueInvoice.balanceDuePaise)}
                </Text>

                <TouchableOpacity
                  onPress={() => setSelectedInvoiceForPayment(overdueInvoice as any)}
                  style={{
                    width: '100%',
                    backgroundColor: '#4F5330',
                    paddingVertical: 12,
                    borderRadius: 9999,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Mark received
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment Ledger Section */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Payment Ledger
            </Text>

            {ledgerItems.length === 0 ? (
              <View
                style={{
                  padding: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFDF8',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                }}
              >
                <Receipt size={32} color="#94A3B8" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#657080', marginTop: 8 }}>
                  No payment records yet
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 18,
                  overflow: 'hidden',
                }}
              >
                {ledgerItems.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleViewReceipt(item)}
                    activeOpacity={0.7}
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: idx < ledgerItems.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0ECE1',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                        {formatSafeDate(item.date)}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                      >
                        {item.mode}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                        {formatINR(item.amountPaise)}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: '#4F5330', marginTop: 2 }}
                      >
                        {item.receiptNumber}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: ID PROOF */}
        {activeTab === 'id_proof' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 24,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                    {tenant.kycDocType ? tenant.kycDocType.toUpperCase() + ' card' : 'Aadhaar card'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                    {tenant.kycMaskedNumber || 'XXXX XXXX 4521'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F0FDF4',
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 9999,
                  }}
                >
                  <ShieldCheck size={14} color="#15803D" />
                  <Text
                    style={{ fontSize: 11, fontWeight: '700', color: '#15803D', marginLeft: 4 }}
                  >
                    KYC verified
                  </Text>
                </View>
              </View>

              {/* ID Document Preview Area */}
              {tenant.kycDocUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setShowIdDocViewer(true)}
                  style={{
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: 200,
                      backgroundColor: '#0C192B',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      source={{ uri: tenant.kycDocUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Tap to view overlay banner */}
                  <View
                    style={{
                      backgroundColor: 'rgba(12, 25, 43, 0.9)',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Eye size={15} color="#FFFFFF" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                        Tap to view full screen
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#4F5330',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                        VERIFIED
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    backgroundColor: '#FAF5EB',
                    borderRadius: 16,
                    padding: 24,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#E5DDCD',
                    marginBottom: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <User size={24} color="#657080" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                    No Document Uploaded
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: '#657080', textAlign: 'center', marginTop: 4 }}
                  >
                    Upload an Aadhaar, PAN or Voter ID proof for this tenant
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {tenant.kycDocUrl && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowIdDocViewer(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#4F5330',
                      paddingVertical: 12,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Eye size={16} color="#FFFFFF" />
                    <Text
                      style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 }}
                    >
                      View Document
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isReplacingPhoto}
                  onPress={handleReplacePhoto}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#4F5330',
                    backgroundColor: tenant.kycDocUrl ? '#FFFDF8' : '#4F5330',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isReplacingPhoto ? (
                    <ActivityIndicator size="small" color="#4F5330" />
                  ) : (
                    <>
                      <Camera size={16} color={tenant.kycDocUrl ? '#4F5330' : '#FFFFFF'} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: tenant.kycDocUrl ? '#4F5330' : '#FFFFFF',
                          marginLeft: 8,
                        }}
                      >
                        {tenant.kycDocUrl ? 'Replace Photo' : 'Upload ID Proof'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Consent Note */}
              <Text style={{ fontSize: 11.5, color: '#657080', lineHeight: 17 }}>
                Consent to store ID given on {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                . Stored privately, visible only to you and managers.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFDF8',
          borderTopWidth: 1,
          borderTopColor: '#E5DDCD',
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {tenant.status === 'notice_period' ? (
          <TouchableOpacity
            onPress={handleCancelNotice}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: '#FDE047',
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FEF3C7',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>Cancel notice</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() =>
              setNoticeModal({ visible: true, days: 30, notes: '', isSubmitting: false })
            }
            style={{
              flex: 1,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFDF8',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
              Start notice period
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push(`/checkout/${tenant._id}`)}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4F5330',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Checkout</Text>
        </TouchableOpacity>
      </View>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <RecordPaymentModal
          visible={Boolean(selectedInvoiceForPayment)}
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onRecordPayment={handleRecordPayment}
          isSubmitting={isPaymentSubmitting}
        />
      )}

      {/* Action Bottom Sheet (Page 3) */}
      <Modal
        visible={isActionSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionSheetVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsActionSheetVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#FFFDF8',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 32,
              paddingHorizontal: 24,
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
            }}
          >
            <View
              style={{
                width: 48,
                height: 5,
                backgroundColor: '#E5DDCD',
                borderRadius: 9999,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#D1F4F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0799AA' }}>
                  {getInitials(tenant.fullName)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0C192B' }}>
                  {tenant.fullName}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  Bed {bedInfo.bedNumber} ·{' '}
                  {balanceDuePaise > 0 ? `Due ${formatINR(balanceDuePaise)}` : 'Paid'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setIsActionSheetVisible(false);
                router.push(`/tenant/edit/${tenant._id}` as any);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
              }}
            >
              <Edit2 size={20} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                Edit tenant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsActionSheetVisible(false);
                handleWhatsApp();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F0ECE1',
              }}
            >
              <MessageSquare size={20} color="#0C192B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                Send WhatsApp reminder
              </Text>
            </TouchableOpacity>

            {tenant.status === 'notice_period' ? (
              <TouchableOpacity
                onPress={handleCancelNotice}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Clock size={20} color="#B45309" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#B45309', marginLeft: 14 }}>
                  Cancel notice period
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsActionSheetVisible(false);
                  setNoticeModal({ visible: true, days: 30, notes: '', isSubmitting: false });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0ECE1',
                }}
              >
                <Clock size={20} color="#0C192B" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginLeft: 14 }}>
                  Start notice period
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleDeleteCheck}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            >
              <Trash2 size={20} color="#BE123C" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C', marginLeft: 14 }}>
                Delete tenant
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* "Can't delete yet" Modal (Page 10) */}
      <Modal
        visible={cantDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCantDeleteModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={30} color="#B45309" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: '#0C192B',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Can’t delete yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#657080',
                textAlign: 'center',
                lineHeight: 19,
                marginBottom: 20,
              }}
            >
              {tenant.fullName} is still in Bed {bedInfo.bedNumber} with{' '}
              {formatINR(balanceDuePaise)} due and a {formatINR(tenant.depositPaise || 0)} deposit
              held. Check him out first to settle dues, then you can delete his record.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setCantDeleteModal(false);
                router.push(`/checkout/${tenant._id}`);
              }}
              style={{
                width: '100%',
                backgroundColor: '#4F5330',
                paddingVertical: 14,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Go to checkout →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCantDeleteModal(false)}
              style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#657080', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={confirmDeleteModal}
        onClose={() => setConfirmDeleteModal(false)}
        onConfirm={handleExecuteDelete}
        title={`Delete ${tenant.fullName}?`}
        message="His profile, ID photo, invoices and receipts will be removed. You will have 10 seconds to undo."
        confirmLabel="Delete"
      />

      {/* Notice Period Modal */}
      <Modal
        visible={noticeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginBottom: 4 }}>
              Start Notice Period
            </Text>
            <Text style={{ fontSize: 12, color: '#657080', marginBottom: 16 }}>
              Set expected departure date for {tenant.fullName}.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
              Notice Duration
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[15, 30, 45].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setNoticeModal(prev => ({ ...prev, days: d }))}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: noticeModal.days === d ? '#19D3E6' : '#FAF5EB',
                    borderColor: noticeModal.days === d ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#0C192B',
                    }}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}>
              Notes (Optional)
            </Text>
            <TextInput
              value={noticeModal.notes}
              onChangeText={(text: string) => setNoticeModal(prev => ({ ...prev, notes: text }))}
              placeholder="e.g. Job transfer"
              placeholderTextColor="#8C939D"
              style={{
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                color: '#0C192B',
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 9999,
                  alignItems: 'center',
                  backgroundColor: '#FFFDF8',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNoticeSubmit}
                disabled={noticeModal.isSubmitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {noticeModal.isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    Confirm Notice
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Picker Modal (Camera vs Gallery) */}
      <Modal
        visible={showPhotoPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoPickerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{ width: 48, height: 4, borderRadius: 9999, backgroundColor: '#E5DDCD' }}
              />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginBottom: 4 }}>
              {tenant?.kycDocUrl ? 'Replace ID Document' : 'Upload ID Document'}
            </Text>
            <Text style={{ fontSize: 12, color: '#657080', marginBottom: 20 }}>
              Take a new photo with camera or choose an image from your gallery
            </Text>

            <View style={{ gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCaptureNewPhoto}
                style={{
                  backgroundColor: '#FAF5EB',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  padding: 16,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#4F5330',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Camera size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                    Take Photo (Camera)
                  </Text>
                  <Text style={{ fontSize: 12, color: '#657080', marginTop: 2 }}>
                    Snap a new photo of tenant ID
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
                style={{
                  backgroundColor: '#FAF5EB',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  padding: 16,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <ImageIcon size={20} color="#0C192B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                    Choose from Photos
                  </Text>
                  <Text style={{ fontSize: 12, color: '#657080', marginTop: 2 }}>
                    Pick document from gallery or downloads
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPhotoPickerModal(false)}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-Screen ID Proof Viewer Modal */}
      <IdDocumentViewerModal
        visible={showIdDocViewer}
        onClose={() => setShowIdDocViewer(false)}
        documentUrl={tenant?.kycDocUrl}
        tenantName={tenant?.fullName}
        docType={tenant?.kycDocType || 'Aadhaar'}
        maskedNumber={tenant?.kycMaskedNumber}
      />
    </SafeAreaView>
  );
}
