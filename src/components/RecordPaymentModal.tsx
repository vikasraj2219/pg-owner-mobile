import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Check, Receipt, CreditCard, Banknote, Building2 } from 'lucide-react-native';
import { DueInvoiceItem, MarkPaidResponseData } from '../types/api';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { generateAndShareReceipt } from '../utils/pdfReceipt';
import { SuccessActionModal } from './SuccessActionModal';

interface RecordPaymentModalProps {
  visible: boolean;
  invoice: DueInvoiceItem | null;
  onClose: () => void;
  onRecordPayment: (payload: {
    invoiceId: string;
    amountPaise: number;
    paymentMethod: 'cash' | 'upi' | 'bank_transfer';
    transactionReference?: string;
    notes?: string;
  }) => Promise<MarkPaidResponseData>;
  isSubmitting?: boolean;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  visible,
  invoice,
  onClose,
  onRecordPayment,
  isSubmitting = false,
}) => {
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'bank_transfer'>('upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [shareReceipt, setShareReceipt] = useState(true);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    receiptNumber: string;
    tenantName: string;
    amountPaise: number;
  } | null>(null);

  const balanceDuePaise = invoice?.balanceDuePaise ?? invoice?.totalAmountPaise ?? 0;

  useEffect(() => {
    if (visible && invoice) {
      setIsFullPayment(true);
      setCustomAmountStr('');
      setPaymentMethod('upi');
      setTransactionRef('');
      setNotes('');
      setShareReceipt(true);
    }
  }, [visible, invoice]);

  if (!invoice) return null;

  const currentPayablePaise = isFullPayment
    ? balanceDuePaise
    : Math.round((parseFloat(customAmountStr) || 0) * 100);

  const getBedNumber = () => {
    const bedObj = invoice.tenant?.currentBed;
    if (typeof bedObj === 'object' && bedObj && 'bedNumber' in bedObj) {
      return `Bed ${bedObj.bedNumber}`;
    }
    return 'Bed';
  };

  const handleSubmit = async () => {
    if (currentPayablePaise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (currentPayablePaise > balanceDuePaise) {
      Alert.alert(
        'Amount Exceeds Due',
        `Payment cannot exceed the outstanding balance of ${formatINR(balanceDuePaise)}.`,
      );
      return;
    }

    try {
      const response = await onRecordPayment({
        invoiceId: invoice._id,
        amountPaise: currentPayablePaise,
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const receiptNumber = response.payment?.receiptNumber || 'RCP-RECENT';

      if (shareReceipt) {
        try {
          await generateAndShareReceipt({
            receiptNo: receiptNumber,
            tenantName: invoice.tenant?.fullName || 'Tenant',
            bedNo: getBedNumber(),
            amountPaise: currentPayablePaise,
            date: formatSafeDate(new Date()),
            property: invoice.property?.name || 'PG Property',
            paymentMethod,
            transactionRef: transactionRef.trim() || undefined,
          });
        } catch (shareErr) {
          // If share sheet is cancelled by user, continue seamlessly
          console.warn('PDF share dismissed:', shareErr);
        }
      }

      setPaymentSuccessData({
        receiptNumber,
        tenantName: invoice.tenant?.fullName || 'Tenant',
        amountPaise: currentPayablePaise,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to record payment. Please try again.';
      Alert.alert('Payment Failed', message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <View
          style={{
            backgroundColor: '#FAF5EB',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#E5DDCD',
            maxHeight: '92%',
            paddingTop: 18,
            paddingHorizontal: 20,
            paddingBottom: Platform.OS === 'ios' ? 32 : 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
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
              >
                <Receipt size={20} color="#4F5330" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                  Record Rent Payment
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                  {invoice.tenant?.fullName} · {getBedNumber()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#0C192B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 12 }}
          >
            {/* Balance Due Card */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 18,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#657080',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Outstanding Balance
                </Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: '#E11D48',
                    marginTop: 2,
                  }}
                >
                  {formatINR(balanceDuePaise)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#FFE4E6',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 9999,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#E11D48' }}>Due</Text>
              </View>
            </View>

            {/* Payment Amount Choice */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Payment Amount
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setIsFullPayment(true)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  backgroundColor: isFullPayment ? '#19D3E6' : '#FFFDF8',
                  borderColor: isFullPayment ? '#19D3E6' : '#E5DDCD',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    color: isFullPayment ? '#0C192B' : '#657080',
                  }}
                >
                  Full Payment
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '900',
                    marginTop: 2,
                    color: '#0C192B',
                  }}
                >
                  {formatINR(balanceDuePaise)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsFullPayment(false)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  backgroundColor: !isFullPayment ? '#19D3E6' : '#FFFDF8',
                  borderColor: !isFullPayment ? '#19D3E6' : '#E5DDCD',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    color: !isFullPayment ? '#0C192B' : '#657080',
                  }}
                >
                  Partial Payment
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '900',
                    marginTop: 2,
                    color: '#0C192B',
                  }}
                >
                  Custom ₹
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Amount Input if Partial */}
            {!isFullPayment && (
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 6 }}
                >
                  Enter partial amount (₹)
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    backgroundColor: '#FFFDF8',
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#657080', marginRight: 6 }}
                  >
                    ₹
                  </Text>
                  <TextInput
                    value={customAmountStr}
                    onChangeText={setCustomAmountStr}
                    placeholder="e.g. 5000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#0C192B',
                    }}
                  />
                </View>
              </View>
            )}

            {/* Payment Method Selector */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Payment Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('upi')}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: paymentMethod === 'upi' ? '#4F5330' : '#FFFDF8',
                  borderColor: paymentMethod === 'upi' ? '#4F5330' : '#E5DDCD',
                }}
              >
                <CreditCard size={16} color={paymentMethod === 'upi' ? '#FFFFFF' : '#657080'} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: paymentMethod === 'upi' ? '#FFFFFF' : '#0C192B',
                  }}
                >
                  UPI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('cash')}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: paymentMethod === 'cash' ? '#4F5330' : '#FFFDF8',
                  borderColor: paymentMethod === 'cash' ? '#4F5330' : '#E5DDCD',
                }}
              >
                <Banknote size={16} color={paymentMethod === 'cash' ? '#FFFFFF' : '#657080'} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: paymentMethod === 'cash' ? '#FFFFFF' : '#0C192B',
                  }}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('bank_transfer')}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: paymentMethod === 'bank_transfer' ? '#4F5330' : '#FFFDF8',
                  borderColor: paymentMethod === 'bank_transfer' ? '#4F5330' : '#E5DDCD',
                }}
              >
                <Building2
                  size={16}
                  color={paymentMethod === 'bank_transfer' ? '#FFFFFF' : '#657080'}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: paymentMethod === 'bank_transfer' ? '#FFFFFF' : '#0C192B',
                  }}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reference / UTR input */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 4 }}>
                Transaction Reference / UTR (optional)
              </Text>
              <TextInput
                value={transactionRef}
                onChangeText={setTransactionRef}
                placeholder="e.g. UPI Ref / Cheque No."
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0C192B',
                  backgroundColor: '#FFFDF8',
                }}
              />
            </View>

            {/* Notes input */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginBottom: 4 }}>
                Internal Note (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Paid in cash at reception"
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0C192B',
                  backgroundColor: '#FFFDF8',
                }}
              />
            </View>

            {/* Share PDF Receipt Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShareReceipt(!shareReceipt)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                backgroundColor: '#FFFDF8',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: shareReceipt ? '#4F5330' : '#FFFDF8',
                  borderColor: shareReceipt ? '#4F5330' : '#94A3B8',
                }}
              >
                {shareReceipt && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
                  Generate & Share PDF Receipt
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080' }}>
                  Opens share sheet with branded PDF receipt upon confirmation
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sticky/Fixed Height Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || currentPayablePaise <= 0}
              activeOpacity={0.85}
              style={{
                height: 52,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSubmitting || currentPayablePaise <= 0 ? '#CBD5E1' : '#4F5330',
                shadowColor: '#4F5330',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isSubmitting || currentPayablePaise <= 0 ? 0 : 0.25,
                shadowRadius: 6,
                elevation: 3,
                marginBottom: 6,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  Confirm Received {formatINR(currentPayablePaise)}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Modern In-App Success Feedback Modal */}
        <SuccessActionModal
          visible={!!paymentSuccessData}
          onClose={() => {
            setPaymentSuccessData(null);
            onClose();
          }}
          title="Payment Recorded! 🎉"
          message={`Payment of ${formatINR(paymentSuccessData?.amountPaise || 0)} has been recorded for ${paymentSuccessData?.tenantName}. Receipt ${paymentSuccessData?.receiptNumber} generated.`}
          highlightCard={{
            icon: <Receipt size={16} color="#15803D" />,
            title: `Receipt ${paymentSuccessData?.receiptNumber}`,
            subtitle: `${paymentSuccessData?.tenantName} · ${formatINR(paymentSuccessData?.amountPaise || 0)}`,
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
