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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQueryClient } from '@tanstack/react-query';
import { uploadKycDocumentApi } from '../../src/api/upload';
import { IdDocumentViewerModal } from '../../src/components/IdDocumentViewerModal';
import { useTenantDetail } from '../../src/hooks/useTenants';
import { formatINR } from '../../src/utils/currency';
import { formatSafeDate, formatDayMonth, formatSafeMonthYear } from '../../src/utils/date';
import { openWhatsApp, sendRentReminder } from '../../src/utils/whatsapp';
import { RecordPaymentModal } from '../../src/components/RecordPaymentModal';
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
    if (!tenant?.currentBed || typeof tenant.currentBed !== 'object') {
      return { bedNumber: 'N/A', roomNumber: 'N/A', floorNumber: 'N/A' };
    }
    return {
      bedNumber: tenant.currentBed.bedNumber || 'N/A',
      roomNumber: tenant.currentBed.room?.roomNumber || 'N/A',
      floorNumber:
        tenant.currentBed.room?.floorNumber !== undefined
          ? String(tenant.currentBed.room.floorNumber)
          : 'N/A',
    };
  }, [tenant]);

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
      void sendRentReminder(
        tenant.phone,
        tenant.fullName,
        bedInfo.bedNumber,
        balanceDuePaise,
        (typeof tenant.property === 'object' && tenant.property?.upiVpa) || '',
      );
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

  // Share Receipt
  const handleShareReceipt = async (item: {
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
        bedNo: bedInfo.bedNumber,
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
      <SafeAreaView edges={['top']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0B6645" />
        <Text className="text-xs font-semibold text-slate-400 mt-2">Loading tenant profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="p-1 -ml-2"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-black text-slate-900">Tenant</Text>
        <View className="flex-row items-center space-x-1">
          <TouchableOpacity
            onPress={() => router.push(`/tenant/edit/${tenant._id}` as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-2 mr-1"
          >
            <Edit2 size={20} color="#0B6645" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsActionSheetVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-2"
          >
            <MoreVertical size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Section */}
        <View className="px-5 pt-5 pb-4">
          <View className="flex-row items-center">
            {/* Initials Avatar */}
            <View className="w-16 h-16 rounded-full bg-[#E0F2FE] items-center justify-center mr-4">
              <Text className="text-xl font-black text-[#0369A1]">
                {getInitials(tenant.fullName)}
              </Text>
            </View>

            {/* Name & Room Details */}
            <View className="flex-1">
              <Text className="text-xl font-black text-slate-900 leading-tight">
                {tenant.fullName}
              </Text>
              <Text className="text-xs font-semibold text-slate-500 mt-1">
                Bed {bedInfo.bedNumber} · Room {bedInfo.roomNumber} · Floor {bedInfo.floorNumber}
              </Text>

              {/* Badges */}
              <View className="flex-row items-center mt-2 space-x-2">
                {tenant.status === 'active' && (
                  <View className="bg-[#E6F4EA] px-2.5 py-0.5 rounded-full mr-2">
                    <Text className="text-[11px] font-bold text-[#0D652D]">Active</Text>
                  </View>
                )}
                {tenant.status === 'notice_period' && (
                  <View className="bg-[#FEF3C7] px-2.5 py-0.5 rounded-full mr-2">
                    <Text className="text-[11px] font-bold text-[#B45309]">Notice</Text>
                  </View>
                )}
                {tenant.status === 'checked_out' && (
                  <View className="bg-slate-100 px-2.5 py-0.5 rounded-full mr-2">
                    <Text className="text-[11px] font-bold text-slate-600">Checked out</Text>
                  </View>
                )}

                {/* Due badge */}
                {balanceDuePaise > 0 ? (
                  <View className="bg-[#FEE2E2] px-2.5 py-0.5 rounded-full">
                    <Text className="text-[11px] font-bold text-[#991B1B]">DUE</Text>
                  </View>
                ) : (
                  <View className="bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                    <Text className="text-[11px] font-bold text-[#0D652D]">PAID</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Contact Buttons */}
          <View className="flex-row items-center mt-5 space-x-3">
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 flex-row items-center justify-center mr-2 bg-white shadow-sm"
            >
              <Phone size={18} color="#0F172A" />
              <Text className="text-sm font-bold text-slate-900 ml-2">Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              className="flex-1 py-3 px-4 rounded-2xl border border-teal-200 flex-row items-center justify-center ml-2 bg-emerald-50/50 shadow-sm"
            >
              <MessageSquare size={18} color="#0B6645" />
              <Text className="text-sm font-bold text-[#0B6645] ml-2">WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Tabs: Overview | Payments | ID proof */}
        <View className="flex-row border-b border-slate-100 px-5 mt-2">
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'overview' ? 'border-[#0B6645]' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === 'overview' ? 'text-[#0B6645]' : 'text-slate-500'
              }`}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('payments')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'payments' ? 'border-[#0B6645]' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === 'payments' ? 'text-[#0B6645]' : 'text-slate-500'
              }`}
            >
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('id_proof')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'id_proof' ? 'border-[#0B6645]' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === 'id_proof' ? 'text-[#0B6645]' : 'text-slate-500'
              }`}
            >
              ID proof
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View className="px-5 pt-4">
            {/* 3 Metrics Cards */}
            <View className="flex-row space-x-2.5 mb-5">
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 mr-1">
                <Text className="text-[11px] font-semibold text-slate-500">Monthly rent</Text>
                <Text className="text-base font-black text-slate-900 mt-1">
                  {formatINR(tenant.monthlyRentPaise || 0)}
                </Text>
              </View>

              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 mr-1">
                <Text className="text-[11px] font-semibold text-slate-500">Deposit held</Text>
                <Text className="text-base font-black text-slate-900 mt-1">
                  {formatINR(tenant.depositPaise || 0)}
                </Text>
              </View>

              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <Text className="text-[11px] font-semibold text-slate-500">Balance due</Text>
                <Text
                  className={`text-base font-black mt-1 ${
                    balanceDuePaise > 0 ? 'text-[#991B1B]' : 'text-[#15803D]'
                  }`}
                >
                  {formatINR(balanceDuePaise)}
                </Text>
              </View>
            </View>

            {/* Details List Card */}
            <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3.5 mb-4">
              <View className="flex-row items-center justify-between py-1 border-b border-slate-50">
                <Text className="text-xs font-semibold text-slate-500">Phone</Text>
                <Text className="text-sm font-bold text-slate-900">+91 {tenant.phone}</Text>
              </View>

              <View className="flex-row items-center justify-between py-1 border-b border-slate-50">
                <Text className="text-xs font-semibold text-slate-500">Emergency phone</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {tenant.emergencyPhone ? `+91 ${tenant.emergencyPhone}` : 'Not provided'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1 border-b border-slate-50">
                <Text className="text-xs font-semibold text-slate-500">Email</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {tenant.email || 'Not provided'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1 border-b border-slate-50">
                <Text className="text-xs font-semibold text-slate-500">Joined</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1">
                <Text className="text-xs font-semibold text-slate-500">Bed</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {bedInfo.bedNumber} · Floor {bedInfo.floorNumber}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'payments' && (
          <View className="px-5 pt-4">
            {/* Overdue Card if has pending invoice */}
            {overdueInvoice && (
              <View className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-[#991B1B]">
                    {formatSafeMonthYear(new Date(overdueInvoice.dueDate))} rent · due{' '}
                    {formatDayMonth(overdueInvoice.dueDate)}
                  </Text>
                  {overdueDays > 0 && (
                    <Text className="text-xs font-bold text-[#991B1B]">
                      {overdueDays} days overdue
                    </Text>
                  )}
                </View>

                <Text className="text-2xl font-black text-[#991B1B] mb-3">
                  {formatINR(overdueInvoice.balanceDuePaise)}
                </Text>

                <TouchableOpacity
                  onPress={() => setSelectedInvoiceForPayment(overdueInvoice as any)}
                  className="w-full bg-[#0B6645] py-3 rounded-full items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">Mark received</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment Ledger Section */}
            <Text className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Payment Ledger
            </Text>

            {ledgerItems.length === 0 ? (
              <View className="p-8 items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
                <Receipt size={32} color="#94A3B8" />
                <Text className="text-sm font-bold text-slate-700 mt-2">
                  No payment records yet
                </Text>
              </View>
            ) : (
              <View className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 shadow-sm">
                {ledgerItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleShareReceipt(item)}
                    activeOpacity={0.7}
                    className="p-4 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        {formatSafeDate(item.date)}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                        {item.mode}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-black text-slate-900">
                        {formatINR(item.amountPaise)}
                      </Text>
                      <Text className="text-xs font-bold text-[#0B6645] mt-0.5">
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
          <View className="px-5 pt-4">
            <View className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-base font-black text-slate-900">
                    {tenant.kycDocType ? tenant.kycDocType.toUpperCase() + ' card' : 'Aadhaar card'}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                    {tenant.kycMaskedNumber || 'XXXX XXXX 4521'}
                  </Text>
                </View>
                <View className="flex-row items-center bg-[#E6F4EA] px-2.5 py-1 rounded-full">
                  <ShieldCheck size={14} color="#0D652D" />
                  <Text className="text-[11px] font-bold text-[#0D652D] ml-1">KYC verified</Text>
                </View>
              </View>

              {/* ID Document Preview Area */}
              {tenant.kycDocUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setShowIdDocViewer(true)}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-4 shadow-xs relative"
                >
                  <View className="w-full h-52 bg-slate-900 items-center justify-center">
                    <Image
                      source={{ uri: tenant.kycDocUrl }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  </View>

                  {/* Tap to view overlay banner */}
                  <View className="bg-slate-800/90 px-4 py-2.5 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Eye size={15} color="#FFFFFF" />
                      <Text className="text-xs font-bold text-white">Tap to view full screen</Text>
                    </View>
                    <View className="bg-[#0A6C50] px-2 py-0.5 rounded-md">
                      <Text className="text-2xs font-extrabold text-white">VERIFIED</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 mb-4 items-center justify-center">
                  <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-2">
                    <User size={24} color="#64748B" />
                  </View>
                  <Text className="text-sm font-bold text-slate-700">No Document Uploaded</Text>
                  <Text className="text-xs text-slate-500 text-center mt-1">
                    Upload an Aadhaar, PAN or Voter ID proof for this tenant
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3 mb-4">
                {tenant.kycDocUrl && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowIdDocViewer(true)}
                    className="flex-1 bg-[#0A6C50] py-3 rounded-2xl flex-row items-center justify-center shadow-xs"
                  >
                    <Eye size={16} color="#FFFFFF" />
                    <Text className="text-sm font-bold text-white ml-2">View Document</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isReplacingPhoto}
                  onPress={handleReplacePhoto}
                  className={`flex-1 border border-teal-300 py-3 rounded-2xl flex-row items-center justify-center bg-white ${
                    !tenant.kycDocUrl ? 'bg-[#0A6C50] border-[#0A6C50]' : ''
                  }`}
                >
                  {isReplacingPhoto ? (
                    <ActivityIndicator size="small" color="#0A6C50" />
                  ) : (
                    <>
                      <Camera size={16} color={!tenant.kycDocUrl ? '#FFFFFF' : '#0B6645'} />
                      <Text
                        className={`text-sm font-bold ml-2 ${
                          !tenant.kycDocUrl ? 'text-white' : 'text-[#0B6645]'
                        }`}
                      >
                        {tenant.kycDocUrl ? 'Replace Photo' : 'Upload ID Proof'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Consent Note */}
              <Text className="text-xs text-slate-500 leading-relaxed mb-1">
                Consent to store ID given on {formatSafeDate(tenant.joinedDate || tenant.createdAt)}
                . Stored privately, visible only to you and managers.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-xl elevation-10 flex-row items-center space-x-3">
        {tenant.status === 'notice_period' ? (
          <TouchableOpacity
            onPress={handleCancelNotice}
            className="flex-1 py-3.5 border border-amber-300 rounded-full items-center justify-center mr-2 bg-amber-50"
          >
            <Text className="text-xs font-bold text-[#B45309]">Cancel notice</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() =>
              setNoticeModal({ visible: true, days: 30, notes: '', isSubmitting: false })
            }
            className="flex-1 py-3.5 border border-amber-300 rounded-full items-center justify-center mr-2 bg-white"
          >
            <Text className="text-xs font-bold text-[#B45309]">Start notice period</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push(`/checkout/${tenant._id}`)}
          className="flex-1 py-3.5 border border-red-200 rounded-full items-center justify-center ml-2 bg-white"
        >
          <Text className="text-xs font-bold text-[#991B1B]">Checkout</Text>
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
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-t-3xl pt-3 pb-8 px-6 border-t border-slate-100"
          >
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-4" />

            <View className="flex-row items-center pb-4 border-b border-slate-100 mb-2">
              <View className="w-12 h-12 rounded-full bg-[#E0F2FE] items-center justify-center mr-3.5">
                <Text className="text-sm font-black text-[#0369A1]">
                  {getInitials(tenant.fullName)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">{tenant.fullName}</Text>
                <Text className="text-xs font-medium text-slate-500 mt-0.5">
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
              className="flex-row items-center py-3.5 border-b border-slate-50"
            >
              <Edit2 size={20} color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3.5">Edit tenant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsActionSheetVisible(false);
                handleWhatsApp();
              }}
              className="flex-row items-center py-3.5 border-b border-slate-50"
            >
              <MessageSquare size={20} color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3.5">
                Send WhatsApp reminder
              </Text>
            </TouchableOpacity>

            {tenant.status === 'notice_period' ? (
              <TouchableOpacity
                onPress={handleCancelNotice}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <Clock size={20} color="#D97706" />
                <Text className="text-sm font-bold text-[#D97706] ml-3.5">
                  Cancel notice period
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsActionSheetVisible(false);
                  setNoticeModal({ visible: true, days: 30, notes: '', isSubmitting: false });
                }}
                className="flex-row items-center py-3.5 border-b border-slate-50"
              >
                <Clock size={20} color="#334155" />
                <Text className="text-sm font-bold text-slate-800 ml-3.5">Start notice period</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleDeleteCheck} className="flex-row items-center py-3.5">
              <Trash2 size={20} color="#DC2626" />
              <Text className="text-sm font-bold text-[#DC2626] ml-3.5">Delete tenant</Text>
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
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
              <AlertTriangle size={32} color="#D97706" />
            </View>
            <Text className="text-xl font-black text-slate-900 text-center mb-2">
              Can’t delete yet
            </Text>
            <Text className="text-sm text-slate-600 text-center leading-relaxed mb-6">
              {tenant.fullName} is still in Bed {bedInfo.bedNumber} with{' '}
              {formatINR(balanceDuePaise)} due and a {formatINR(tenant.depositPaise || 0)} deposit
              held. Check him out first to settle dues, then you can delete his record.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setCantDeleteModal(false);
                router.push(`/checkout/${tenant._id}`);
              }}
              className="w-full bg-[#0B6645] py-3.5 rounded-full items-center justify-center mb-3"
            >
              <Text className="text-white font-bold text-base">[→ Go to checkout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCantDeleteModal(false)}
              className="py-2.5 items-center justify-center"
            >
              <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal (Page 11) */}
      <Modal
        visible={confirmDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
              <Trash2 size={32} color="#DC2626" />
            </View>
            <Text className="text-xl font-black text-slate-900 text-center mb-2">
              Delete {tenant.fullName}?
            </Text>
            <Text className="text-sm text-slate-600 text-center leading-relaxed mb-6">
              His profile, ID photo, invoices and receipts will be removed. You will have 10 seconds
              to undo.
            </Text>

            <View className="flex-row items-center space-x-3 w-full">
              <TouchableOpacity
                onPress={() => setConfirmDeleteModal(false)}
                className="flex-1 border border-slate-300 py-3.5 rounded-full items-center justify-center mr-2"
              >
                <Text className="text-slate-700 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteDelete}
                className="flex-1 bg-[#DC2626] py-3.5 rounded-full items-center justify-center ml-2"
              >
                <Text className="text-white font-bold text-sm">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notice Period Modal */}
      <Modal
        visible={noticeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <Text className="text-lg font-black text-slate-900 mb-1">Start Notice Period</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Set expected departure date for {tenant.fullName}.
            </Text>

            <Text className="text-xs font-bold text-slate-700 mb-2">Notice Duration</Text>
            <View className="flex-row mb-4 space-x-2">
              {[15, 30, 45].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setNoticeModal(prev => ({ ...prev, days: d }))}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center mr-1 ${
                    noticeModal.days === d
                      ? 'bg-[#0B6645] border-[#0B6645]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      noticeModal.days === d ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-bold text-slate-700 mb-1">Notes (Optional)</Text>
            <TextInput
              value={noticeModal.notes}
              onChangeText={(text: string) => setNoticeModal(prev => ({ ...prev, notes: text }))}
              placeholder="e.g. Job transfer"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 mb-6"
            />

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => setNoticeModal(prev => ({ ...prev, visible: false }))}
                className="flex-1 py-3 border border-slate-200 rounded-full items-center mr-2"
              >
                <Text className="text-xs font-bold text-slate-600">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNoticeSubmit}
                disabled={noticeModal.isSubmitting}
                className="flex-1 py-3 bg-[#0B6645] rounded-full items-center ml-2"
              >
                {noticeModal.isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">Confirm Notice</Text>
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-8 shadow-2xl">
            <View className="items-center mb-4">
              <View className="w-12 h-1 rounded-full bg-slate-300" />
            </View>

            <Text className="text-lg font-black text-slate-900 mb-1">
              {tenant?.kycDocUrl ? 'Replace ID Document' : 'Upload ID Document'}
            </Text>
            <Text className="text-xs text-slate-500 mb-5">
              Take a new photo with camera or choose an image from your gallery
            </Text>

            <View className="gap-3 mb-4">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCaptureNewPhoto}
                className="bg-[#E8F5EE] border border-[#A7F3D0] p-4 rounded-2xl flex-row items-center"
              >
                <View className="w-10 h-10 rounded-full bg-[#0A6C50] items-center justify-center mr-3.5">
                  <Camera size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-slate-900">Take Photo (Camera)</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Snap a new photo of tenant ID
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex-row items-center"
              >
                <View className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center mr-3.5">
                  <ImageIcon size={20} color="#334155" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-slate-900">Choose from Photos</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Pick document from gallery or downloads
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPhotoPickerModal(false)}
              className="py-3 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-sm font-bold text-slate-700">Cancel</Text>
            </TouchableOpacity>
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-8 shadow-2xl">
            <View className="items-center mb-4">
              <View className="w-12 h-1 rounded-full bg-slate-300" />
            </View>

            <Text className="text-lg font-black text-slate-900 mb-1">
              {tenant?.kycDocUrl ? 'Replace ID Document' : 'Upload ID Document'}
            </Text>
            <Text className="text-xs text-slate-500 mb-5">
              Take a new photo with camera or choose an image from your gallery
            </Text>

            <View className="gap-3 mb-4">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCaptureNewPhoto}
                className="bg-[#E8F5EE] border border-[#A7F3D0] p-4 rounded-2xl flex-row items-center"
              >
                <View className="w-10 h-10 rounded-full bg-[#0A6C50] items-center justify-center mr-3.5">
                  <Camera size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-slate-900">Take Photo (Camera)</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Snap a new photo of tenant ID
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex-row items-center"
              >
                <View className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center mr-3.5">
                  <ImageIcon size={20} color="#334155" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-slate-900">Choose from Photos</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Pick document from gallery or downloads
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPhotoPickerModal(false)}
              className="py-3 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-sm font-bold text-slate-700">Cancel</Text>
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
