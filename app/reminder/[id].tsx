import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
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
    propertyName?: string;
  }>();

  const { selectedProperty } = useProperties();
  const { invoices } = useInvoices(selectedProperty?._id);
  const { matrixData } = useMatrix(selectedProperty?._id || null);

  // Match invoice if available
  const invoice = useMemo(() => {
    if (!params.id) return null;
    return (
      invoices.find(
        inv =>
          inv._id === params.id ||
          inv.invoiceNumber === params.id ||
          (typeof inv.tenant === 'object'
            ? inv.tenant?._id === params.id
            : inv.tenant === params.id),
      ) || null
    );
  }, [invoices, params.id]);

  const isQrAttached = true;
  const [isSharingPass, setIsSharingPass] = useState(false);
  const passSvgRef = useRef<Svg | null>(null);

  // Tenant Details
  const fullName = params.tenantName || invoice?.tenant?.fullName || 'Tenant';
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

  const bedNo = params.bedNo || resolvedBed.bedLabel || 'Bed';

  const amountPaise = useMemo(() => {
    if (params.amountPaise && parseInt(params.amountPaise, 10) > 0) {
      return parseInt(params.amountPaise, 10);
    }
    if (invoice?.balanceDuePaise) return invoice.balanceDuePaise;
    if (invoice?.totalAmountPaise) return invoice.totalAmountPaise;
    return 750000;
  }, [params.amountPaise, invoice]);

  const amountFormatted = `₹${Math.round(amountPaise / 100).toLocaleString('en-IN')}`;

  const overdueDays = useMemo(() => {
    if (params.overdueDays) return parseInt(params.overdueDays, 10);
    if (invoice?.overdueDays !== undefined) return invoice.overdueDays;
    return 0;
  }, [params.overdueDays, invoice]);

  const propertyName =
    params.propertyName ||
    (typeof invoice?.property === 'object' && (invoice?.property as any)?.name) ||
    selectedProperty?.name ||
    'PG Living';

  const upiVpa =
    params.upiVpa ||
    (typeof invoice?.property === 'object' && (invoice?.property as any)?.upiVpa) ||
    selectedProperty?.upiVpa ||
    'owner@upi';

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

  // Configured reminder send time: 2:30 PM IST
  const currentTimeString = '2:30 pm';

  // UPI deep link for payment link & QR
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(
    propertyName,
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
      propertyName,
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
    propertyName,
    selectedType,
  ]);

  const openWhatsAppDirectly = async () => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
      // already has country code
    } else {
      cleanPhone = `91${cleanPhone}`;
    }

    let finalMessage = reminderMessage;
    if (isQrAttached && !finalMessage.includes('Instant UPI Payment Link')) {
      finalMessage += `\n\nInstant UPI Payment Link:\n${upiPayload}`;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(finalMessage)}`,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF5EB' }} edges={['top']}>
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
          propertyName={propertyName}
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

      {/* Top Header matching Add Room / Edit Room design */}
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

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}>
            Send Reminder
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
            WhatsApp rent reminder & digital pass
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Tenant Card */}
        <View
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 20,
            padding: 16,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FAF7F0',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#4F5330' }}>{initials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                {fullName}
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                numberOfLines={1}
              >
                {displayPhone} · {bedNo}
              </Text>
            </View>
          </View>

          {/* Dynamic Status Badge */}
          {selectedType === 'pre_reminder' ? (
            <View
              style={{
                backgroundColor: '#E8F5E9',
                borderWidth: 1,
                borderColor: '#C8E6C9',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>
                {daysUntilDue > 0 ? `${daysUntilDue} days left` : '2 days left'}
              </Text>
            </View>
          ) : selectedType === 'due_today' ? (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderWidth: 1,
                borderColor: '#FDE68A',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>Due today</Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#991B1B' }}>
                {overdueDays > 0 ? `${overdueDays} days overdue` : 'Rent due'}
              </Text>
            </View>
          )}
        </View>

        {/* 3-Stage Reminder Selector */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 16,
            padding: 4,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('pre_reminder')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedType === 'pre_reminder' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: selectedType === 'pre_reminder' ? '800' : '600',
                color: selectedType === 'pre_reminder' ? '#0C192B' : '#657080',
              }}
            >
              Pre-reminder (2d)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('due_today')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedType === 'due_today' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: selectedType === 'due_today' ? '800' : '600',
                color: selectedType === 'due_today' ? '#0C192B' : '#657080',
              }}
            >
              Due today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedType('overdue')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedType === 'overdue' ? '#19D3E6' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: selectedType === 'overdue' ? '800' : '600',
                color: selectedType === 'overdue' ? '#0C192B' : '#657080',
              }}
            >
              Overdue
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message Preview Box with Scheduled Time Pill */}
        <View
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
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
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Message preview
            </Text>
            <View
              style={{
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F5330' }}>
                ⏰ Send Time: 2:30 PM
              </Text>
            </View>
          </View>

          {/* WhatsApp Speech Bubble */}
          <View
            style={{
              backgroundColor: '#FAF7F0',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: '#0C192B',
                fontSize: 13,
                fontWeight: '500',
                lineHeight: 20,
              }}
            >
              {reminderMessage}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: '#8C95A0',
                fontWeight: '500',
                textAlign: 'right',
                marginTop: 6,
              }}
            >
              {currentTimeString}
            </Text>
          </View>

          {/* Fresh Bus-Style Digital Rent Payment Pass Card */}
          <View style={{ marginTop: 2 }}>
            <RentPaymentPassCard
              propertyName={propertyName}
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
        <View style={{ marginTop: 'auto' }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenWhatsApp}
            disabled={isSharingPass}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: '#4F5330',
              borderRadius: 9999,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.3} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
              {isSharingPass ? 'Opening WhatsApp...' : 'Share Pass & Link via WhatsApp'}
            </Text>
          </TouchableOpacity>

          {/* Subtext */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: '#657080',
              textAlign: 'center',
              marginTop: 10,
              lineHeight: 18,
            }}
          >
            Directly opens {firstName}'s WhatsApp chat with the pass card & instant payment link.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
