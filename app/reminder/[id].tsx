import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import Svg from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import { useProperties } from '../../src/context/PropertyContext';
import { useInvoices } from '../../src/hooks/useInvoices';
import { useMatrix } from '../../src/hooks/useMatrix';
import { resolveRoomAndBed } from '../../src/utils/bedResolution';
import { formatSafeDate } from '../../src/utils/date';
import { ReminderType, buildReminderMessage } from '../../src/utils/whatsapp';
import { RentPaymentPassCard } from '../../src/components/RentPaymentPassCard';
import { RentPaymentPassSvg } from '../../src/components/RentPaymentPassSvg';
import { sharePaymentCardToWhatsApp } from '../../src/utils/whatsappShare';

export default function SendReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    tenantName?: string;
    phone?: string;
    bedNo?: string;
    amountPaise?: string;
    overdueDays?: string;
    upiVpa?: string;
    dueDate?: string;
    daysRemaining?: string;
    type?: ReminderType;
  }>();

  const { selectedProperty } = useProperties();
  const { invoices } = useInvoices(selectedProperty?._id);
  const { matrixData } = useMatrix(selectedProperty?._id || null);

  // Match invoice if available
  const invoice = useMemo(() => {
    if (!params.id) return null;
    return invoices.find(inv => inv._id === params.id || inv.invoiceNumber === params.id) || null;
  }, [invoices, params.id]);

  const isQrAttached = true;
  const [isSharingPass, setIsSharingPass] = useState(false);
  const passSvgRef = useRef<Svg | null>(null);

  // Tenant Details
  const fullName = params.tenantName || invoice?.tenant?.fullName || 'Rahul Verma';
  const firstName = fullName.split(' ')[0] || 'there';
  const phone = params.phone || invoice?.tenant?.phone || '9876543210';
  const displayPhone = phone.startsWith('+91') ? phone : `+91 ${phone}`;

  const resolvedBed = useMemo(() => {
    return resolveRoomAndBed({
      rawBedNo: params.bedNo,
      tenantId: invoice?.tenant?._id,
      tenantName: fullName,
      currentBed: invoice?.tenant?.currentBed,
      matrixData,
    });
  }, [params.bedNo, invoice, fullName, matrixData]);

  const bedNo = resolvedBed.bedLabel;

  const amountPaise = useMemo(() => {
    if (params.amountPaise) return parseInt(params.amountPaise, 10);
    if (invoice?.balanceDuePaise) return invoice.balanceDuePaise;
    if (invoice?.totalAmountPaise) return invoice.totalAmountPaise;
    return 850000;
  }, [params.amountPaise, invoice]);

  const amountFormatted = `₹${Math.round(amountPaise / 100).toLocaleString('en-IN')}`;

  const overdueDays = useMemo(() => {
    if (params.overdueDays) return parseInt(params.overdueDays, 10);
    if (invoice?.overdueDays !== undefined) return invoice.overdueDays;
    return 0;
  }, [params.overdueDays, invoice]);

  const upiVpa =
    params.upiVpa || invoice?.property?.upiVpa || selectedProperty?.upiVpa || 'owner@upi';

  // Calculate days remaining / overdue status from due date
  const rawDueDate = invoice?.dueDate || params.dueDate;
  const daysUntilDue = useMemo(() => {
    if (!rawDueDate) return -1;
    const dueTime = new Date(rawDueDate).setHours(0, 0, 0, 0);
    const nowTime = new Date().setHours(0, 0, 0, 0);
    return Math.round((dueTime - nowTime) / (1000 * 60 * 60 * 24));
  }, [rawDueDate]);

  // Auto-detect reminder stage: pre-reminder (2 days remaining), due today, or overdue
  const initialType: ReminderType = useMemo(() => {
    if (params.type) return params.type;
    if (daysUntilDue > 0) return 'pre_reminder';
    if (daysUntilDue === 0) return 'due_today';
    return 'overdue';
  }, [params.type, daysUntilDue]);

  const [selectedType, setSelectedType] = useState<ReminderType>(initialType);

  // Initials
  const initials = useMemo(() => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [fullName]);

  // Configured reminder send time: 2:30 PM IST (changed from 9:00 AM)
  const currentTimeString = '2:30 pm';

  // UPI deep link for payment link & QR
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(
    selectedProperty?.name || 'PG Living',
  )}&am=${(amountPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Rent ${bedNo} ${firstName}`,
  )}`;

  // Formatted reminder message matching user requirements (pre-reminder, due today, overdue)
  const reminderMessage = useMemo(() => {
    return buildReminderMessage({
      name: fullName,
      bed: bedNo,
      amountFormatted,
      dueDateFormatted: rawDueDate ? formatSafeDate(rawDueDate) : undefined,
      daysRemaining: daysUntilDue > 0 ? daysUntilDue : 2,
      overdueDays: overdueDays > 0 ? overdueDays : Math.abs(daysUntilDue),
      upiVpa,
      upiPayload,
      propertyName: selectedProperty?.name,
      type: selectedType,
    });
  }, [
    fullName,
    bedNo,
    amountFormatted,
    rawDueDate,
    daysUntilDue,
    overdueDays,
    upiVpa,
    upiPayload,
    selectedProperty?.name,
    selectedType,
  ]);

  const openWhatsAppDirectly = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    let finalMessage = reminderMessage;
    if (isQrAttached && !finalMessage.includes('Instant UPI Payment Link')) {
      finalMessage += `\n\nInstant UPI Payment Link:\n${upiPayload}`;
    }

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(finalMessage)}`,
        );
      }
    } catch (_err) {
      Alert.alert(
        'WhatsApp Error',
        'Could not open WhatsApp. Please check if WhatsApp is installed on this device.',
      );
    }
  };

  const handleSharePassAndLinkInOneMessage = async () => {
    if (!passSvgRef.current || typeof passSvgRef.current.toDataURL !== 'function') {
      await openWhatsAppDirectly();
      return;
    }

    setIsSharingPass(true);
    try {
      passSvgRef.current.toDataURL(async (base64Data: string) => {
        try {
          if (!base64Data) {
            await openWhatsAppDirectly();
            setIsSharingPass(false);
            return;
          }

          const cleanData = base64Data.replace(/^data:image\/\w+;base64,/, '').trim();
          const cleanBed = (bedNo || 'rent').replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${FileSystem.cacheDirectory}Rent_Pass_${cleanBed}_${Date.now()}.png`;

          await FileSystem.writeAsStringAsync(filename, cleanData, {
            encoding: FileSystem.EncodingType.Base64,
          });

          let finalCaption = reminderMessage;
          if (!finalCaption.includes('Instant UPI Payment Link')) {
            finalCaption += `\n\nInstant UPI Payment Link:\n${upiPayload}`;
          }

          await sharePaymentCardToWhatsApp({
            imageUri: filename,
            message: finalCaption,
            phone,
          });
        } catch (innerErr) {
          console.error('Error sharing pass card:', innerErr);
          await openWhatsAppDirectly();
        } finally {
          setIsSharingPass(false);
        }
      });
    } catch (err) {
      console.error('Error generating pass SVG:', err);
      await openWhatsAppDirectly();
      setIsSharingPass(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    if (isQrAttached) {
      await handleSharePassAndLinkInOneMessage();
    } else {
      await openWhatsAppDirectly();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      {/* Off-screen high-res Pass Card & QR for instant 1-Message sharing */}
      <View
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          left: -9999,
          top: -9999,
        }}
      >
        <RentPaymentPassSvg
          propertyName={selectedProperty?.name || 'Sri Sai Boys PG'}
          tenantName={fullName}
          bedNo={bedNo}
          invoiceNo={invoice?.invoiceNumber || '202611-0002'}
          amountFormatted={amountFormatted}
          upiVpa={upiVpa}
          upiPayload={upiPayload}
          overdueText={
            selectedType === 'overdue' && overdueDays > 0
              ? `${overdueDays} days overdue`
              : selectedType === 'due_today'
                ? 'Due today'
                : 'Due in 2 days'
          }
          getRef={c => {
            passSvgRef.current = c;
          }}
        />
      </View>

      {/* Top Header matching Image 2 */}
      <View className="px-4 py-3 flex-row items-center border-b border-slate-200/60 bg-[#F8F9FA]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-slate-200"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={28} color="#0F172A" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900 tracking-tight ml-1">Send reminder</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Tenant Card matching Image 2 */}
        <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-3 shadow-xs flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-11 h-11 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
              <Text className="text-base font-extrabold text-slate-700">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-xs font-semibold text-slate-500 mt-0.5" numberOfLines={1}>
                {displayPhone} · {bedNo}
              </Text>
            </View>
          </View>

          {/* Dynamic Status Badge */}
          {selectedType === 'pre_reminder' ? (
            <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full">
              <Text className="text-xs font-extrabold text-[#065F46]">
                {daysUntilDue > 0 ? `${daysUntilDue} days left` : '2 days left'}
              </Text>
            </View>
          ) : selectedType === 'due_today' ? (
            <View className="bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1 rounded-full">
              <Text className="text-xs font-extrabold text-[#92400E]">Due today</Text>
            </View>
          ) : (
            <View className="bg-[#FEF2F2] border border-[#FECACA] px-3 py-1 rounded-full">
              <Text className="text-xs font-extrabold text-[#991B1B]">
                {overdueDays > 0 ? `${overdueDays} days overdue` : 'Rent due'}
              </Text>
            </View>
          )}
        </View>

        {/* 3-Stage Reminder Selector: Pre-reminder (2 days before) | Due today | Overdue */}
        <View className="flex-row items-center bg-white p-1 rounded-2xl border border-slate-200/80 mb-3.5 shadow-2xs">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('pre_reminder')}
            className={`flex-1 py-2 rounded-xl items-center justify-center ${
              selectedType === 'pre_reminder' ? 'bg-[#0A6C50]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedType === 'pre_reminder' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Pre-reminder (2d)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('due_today')}
            className={`flex-1 py-2 rounded-xl items-center justify-center ${
              selectedType === 'due_today' ? 'bg-[#0A6C50]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedType === 'due_today' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Due today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('overdue')}
            className={`flex-1 py-2 rounded-xl items-center justify-center ${
              selectedType === 'overdue' ? 'bg-[#0A6C50]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedType === 'overdue' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Overdue
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message Preview Box with Scheduled Time Pill */}
        <View className="bg-[#E8F5EE] border border-[#C7E7D4] rounded-3xl p-5 mb-5 flex-1 justify-start">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Message preview
            </Text>
            <View className="bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-full">
              <Text className="text-[11px] font-black text-[#065F46]">⏰ Send Time: 2:30 PM</Text>
            </View>
          </View>

          {/* WhatsApp Speech Bubble */}
          <View className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-2xl rounded-tl-xs p-4 shadow-2xs mb-3.5">
            <Text className="text-slate-900 text-sm font-semibold leading-relaxed">
              {reminderMessage}
            </Text>
            <Text className="text-[11px] text-slate-400 font-medium text-right mt-2">
              {currentTimeString}
            </Text>
          </View>

          {/* Fresh Bus-Style Digital Rent Payment Pass Card */}
          <View className="mt-1">
            <RentPaymentPassCard
              propertyName={selectedProperty?.name || 'Sri Sai Boys PG'}
              tenantName={fullName}
              bedNo={bedNo}
              invoiceNo={invoice?.invoiceNumber || '202611-0002'}
              amountFormatted={amountFormatted}
              upiVpa={upiVpa}
              upiPayload={upiPayload}
              overdueText={
                selectedType === 'overdue' && overdueDays > 0
                  ? `${overdueDays} days overdue`
                  : selectedType === 'due_today'
                    ? 'Due today'
                    : 'Due in 2 days'
              }
            />
          </View>
        </View>

        {/* Bottom Actions: Single Direct WhatsApp Sender */}
        <View className="mt-auto">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenWhatsApp}
            disabled={isSharingPass}
            className="w-full py-4 bg-[#FACC15] rounded-2xl flex-row items-center justify-center gap-2 shadow-md active:bg-[#EAB308]"
          >
            <Share2 size={20} color="#0F172A" strokeWidth={2.5} />
            <Text className="text-base font-black text-slate-900">
              {isSharingPass ? 'Opening WhatsApp...' : 'Share Pass & Link in One WhatsApp Message'}
            </Text>
          </TouchableOpacity>

          {/* Subtext */}
          <Text className="text-xs font-medium text-slate-500 text-center mt-2.5 leading-normal">
            Directly opens {firstName}'s WhatsApp chat with the pass card & instant payment link.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
