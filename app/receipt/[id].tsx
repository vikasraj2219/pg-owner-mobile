import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Share2, Check, Download, MessageSquare } from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useInvoices } from '../../src/hooks/useInvoices';
import { useMatrix } from '../../src/hooks/useMatrix';
import { AppLogo } from '../../src/components/AppLogo';
import { formatINR } from '../../src/utils/currency';
import { formatSafeDate, formatSafeMonthYear } from '../../src/utils/date';
import { generateAndShareReceipt } from '../../src/utils/pdfReceipt';
import { resolveRoomAndBed } from '../../src/utils/bedResolution';

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    receiptNo?: string;
    date?: string;
    tenantName?: string;
    bedNo?: string;
    forMonth?: string;
    method?: string;
    amountPaise?: string;
    propertyName?: string;
    propertyAddress?: string;
    transactionRef?: string;
  }>();

  const { selectedProperty } = useProperties();
  const { invoices } = useInvoices(selectedProperty?._id);
  const { matrixData } = useMatrix(selectedProperty?._id || null);

  // Match invoice from params or React Query cache
  const invoice = useMemo(() => {
    if (!params.id) return null;
    return invoices.find(inv => inv._id === params.id || inv.invoiceNumber === params.id) || null;
  }, [invoices, params.id]);

  // Derived receipt details with safe defaults
  const propertyName =
    params.propertyName || invoice?.property?.name || selectedProperty?.name || 'Property-1';

  const propertyAddress =
    params.propertyAddress || selectedProperty?.address || 'Chanda Nagar, Hyderabad, 500050';

  const receiptNo =
    params.receiptNo ||
    (invoice?.invoiceNumber
      ? invoice.invoiceNumber.replace('INV-', 'RCP-')
      : 'RCP-202611-B92A-0002');

  const rawDate = params.date || invoice?.paidAt || invoice?.dueDate || new Date().toISOString();
  const formattedDate = formatSafeDate(rawDate);

  const tenantName = params.tenantName || invoice?.tenant?.fullName || 'Tenant - 1';

  // Robust Room & Bed resolution - guaranteed to NEVER show just "Bed"
  const resolvedBed = useMemo(() => {
    return resolveRoomAndBed({
      rawBedNo: params.bedNo,
      tenantId: invoice?.tenant?._id,
      tenantName,
      currentBed: invoice?.tenant?.currentBed,
      matrixData,
      defaultRoom: '101',
      defaultBed: '101-A',
    });
  }, [params.bedNo, invoice, tenantName, matrixData]);

  const forMonth = useMemo(() => {
    if (params.forMonth) return params.forMonth;
    if (invoice?.items?.[0]?.description) return invoice.items[0].description;
    if (invoice?.dueDate) return `${formatSafeMonthYear(new Date(invoice.dueDate))} rent`;
    return 'October 2026 rent';
  }, [params.forMonth, invoice]);

  const method = params.method || invoice?.paymentMethod?.toUpperCase() || 'CASH';

  const amountPaise = useMemo(() => {
    if (params.amountPaise) return parseInt(params.amountPaise, 10);
    if (invoice?.amountPaidPaise) return invoice.amountPaidPaise;
    if (invoice?.totalAmountPaise) return invoice.totalAmountPaise;
    return 1000000;
  }, [params.amountPaise, invoice]);

  const shareData = useMemo(
    () => ({
      receiptNo,
      date: formattedDate,
      tenantName,
      bedNo: resolvedBed.formattedLabel,
      forMonth,
      paymentMethod: method,
      amountPaise,
      property: propertyName,
      propertyAddress,
      transactionRef: params.transactionRef,
    }),
    [
      receiptNo,
      formattedDate,
      tenantName,
      resolvedBed.formattedLabel,
      forMonth,
      method,
      amountPaise,
      propertyName,
      propertyAddress,
      params.transactionRef,
    ],
  );

  const handleSharePdf = async () => {
    try {
      await generateAndShareReceipt(shareData);
    } catch (_err) {
      Alert.alert('Error', 'Unable to share receipt PDF.');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const msg = `*Rent Payment Receipt*\n\nReceipt No: ${receiptNo}\nProperty: ${propertyName}\nTenant: ${tenantName}\nRoom & Bed: ${resolvedBed.formattedLabel}\nFor: ${forMonth}\nAmount Received: ${formatINR(amountPaise)}\nMethod: ${method}\nDate: ${formattedDate}\n\nThank you for your payment!`;
      const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
      }
    } catch (_e) {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      {/* Top Header matching Screenshot */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF5EB',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

        <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>Receipt</Text>

        <TouchableOpacity
          onPress={handleSharePdf}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          <Share2 size={18} color="#0C192B" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Card: Payment Received! matching Screenshot */}
        <View
          style={{
            backgroundColor: '#F0FDF4',
            borderWidth: 1,
            borderColor: '#DCFCE7',
            borderRadius: 22,
            paddingVertical: 20,
            paddingHorizontal: 20,
            alignItems: 'center',
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: '#16A34A',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Check size={24} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
            Payment Received!
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 3 }}>
            Rent payment has been successfully received
          </Text>
        </View>

        {/* Receipt Details Card matching Screenshot */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#F0ECE4',
            borderRadius: 22,
            padding: 20,
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {/* Property Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 14 }}>
              <AppLogo size={52} variant="green" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B', lineHeight: 22 }}>
                {propertyName}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                {propertyAddress}
              </Text>
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
                  alignSelf: 'flex-start',
                  marginTop: 6,
                }}
              >
                <Check size={12} color="#15803D" strokeWidth={3} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D', marginLeft: 4 }}>
                  Paid
                </Text>
              </View>
            </View>
          </View>

          {/* Dashed Separator Line */}
          <View
            style={{
              height: 1,
              borderTopWidth: 1,
              borderTopColor: '#E5DDCD',
              borderStyle: 'dashed',
              marginVertical: 16,
            }}
          />

          {/* Key-Value Detail Rows */}
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>Receipt No.</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>{receiptNo}</Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>Date</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                {formattedDate}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>Tenant</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                {tenantName}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>Room & Bed</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                {resolvedBed.formattedLabel}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>For</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>{forMonth}</Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#657080' }}>Method</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>{method}</Text>
            </View>
          </View>
        </View>

        {/* Amount Received Card matching Screenshot */}
        <View
          style={{
            backgroundColor: '#EBFDF2',
            borderWidth: 1,
            borderColor: '#BBF7D0',
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>Amount Received</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#15803D' }}>
            {formatINR(amountPaise)}
          </Text>
        </View>

        {/* Computer generated notice */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Check size={13} color="#15803D" strokeWidth={3} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginLeft: 4 }}>
            Computer generated receipt. No signature required.
          </Text>
        </View>

        {/* Two Action Buttons */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSharePdf}
          style={{
            width: '100%',
            paddingVertical: 15,
            backgroundColor: '#4F5330',
            borderRadius: 9999,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Download size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 }}>
            Download Receipt PDF
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleShareWhatsApp}
          style={{
            width: '100%',
            paddingVertical: 15,
            backgroundColor: '#FFFDF8',
            borderWidth: 1.5,
            borderColor: '#E8DFC9',
            borderRadius: 9999,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <MessageSquare size={18} color="#25D366" />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B', marginLeft: 8 }}>
            Share via WhatsApp
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
