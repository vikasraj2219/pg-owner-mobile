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
      }

      Alert.alert(
        'Payment Recorded! 🎉',
        `Receipt ${receiptNumber} generated for ${invoice.tenant?.fullName}.\nAmount: ${formatINR(
          currentPayablePaise,
        )}`,
      );
      onClose();
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
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-white rounded-t-3xl p-6 max-h-[90%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                <Receipt size={22} color="#0A6C50" />
              </View>
              <View>
                <Text className="text-lg font-black text-slate-900">Record Rent Payment</Text>
                <Text className="text-xs font-semibold text-slate-500">
                  {invoice.tenant?.fullName} · {getBedNumber()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            {/* Balance Due Card */}
            <View className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Outstanding Balance
                </Text>
                <Text className="text-2xl font-black text-rose-600 mt-0.5">
                  {formatINR(balanceDuePaise)}
                </Text>
              </View>
              <View className="bg-rose-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-rose-700">Due</Text>
              </View>
            </View>

            {/* Payment Amount Choice */}
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Amount
            </Text>
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={() => setIsFullPayment(true)}
                className={`flex-1 p-3.5 rounded-xl border items-center ${
                  isFullPayment ? 'border-[#0A6C50] bg-emerald-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isFullPayment ? 'text-[#0A6C50]' : 'text-slate-600'
                  }`}
                >
                  Full Payment
                </Text>
                <Text
                  className={`text-base font-extrabold mt-0.5 ${
                    isFullPayment ? 'text-[#0A6C50]' : 'text-slate-800'
                  }`}
                >
                  {formatINR(balanceDuePaise)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsFullPayment(false)}
                className={`flex-1 p-3.5 rounded-xl border items-center ${
                  !isFullPayment ? 'border-[#0A6C50] bg-emerald-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    !isFullPayment ? 'text-[#0A6C50]' : 'text-slate-600'
                  }`}
                >
                  Partial Payment
                </Text>
                <Text
                  className={`text-base font-extrabold mt-0.5 ${
                    !isFullPayment ? 'text-[#0A6C50]' : 'text-slate-800'
                  }`}
                >
                  Custom ₹
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Amount Input if Partial */}
            {!isFullPayment && (
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-600 mb-1">
                  Enter partial amount (₹)
                </Text>
                <View className="flex-row items-center border border-slate-300 rounded-xl px-3 bg-white">
                  <Text className="text-base font-bold text-slate-500 mr-2">₹</Text>
                  <TextInput
                    value={customAmountStr}
                    onChangeText={setCustomAmountStr}
                    placeholder="e.g. 5000"
                    keyboardType="numeric"
                    className="flex-1 py-3 text-base font-bold text-slate-900"
                  />
                </View>
              </View>
            )}

            {/* Payment Method Selector */}
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Mode
            </Text>
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setPaymentMethod('upi')}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  paymentMethod === 'upi'
                    ? 'border-[#0A6C50] bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <CreditCard size={16} color={paymentMethod === 'upi' ? '#0A6C50' : '#64748B'} />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'upi' ? 'text-[#0A6C50]' : 'text-slate-700'
                  }`}
                >
                  UPI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('cash')}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  paymentMethod === 'cash'
                    ? 'border-[#0A6C50] bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Banknote size={16} color={paymentMethod === 'cash' ? '#0A6C50' : '#64748B'} />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'cash' ? 'text-[#0A6C50]' : 'text-slate-700'
                  }`}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('bank_transfer')}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-[#0A6C50] bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Building2
                  size={16}
                  color={paymentMethod === 'bank_transfer' ? '#0A6C50' : '#64748B'}
                />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'bank_transfer' ? 'text-[#0A6C50]' : 'text-slate-700'
                  }`}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reference / UTR input */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-600 mb-1">
                Transaction Reference / UTR (optional)
              </Text>
              <TextInput
                value={transactionRef}
                onChangeText={setTransactionRef}
                placeholder="e.g. UPI Ref / Cheque No."
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white"
              />
            </View>

            {/* Notes input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-600 mb-1">
                Internal Note (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Paid in cash at reception"
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white"
              />
            </View>

            {/* Share PDF Receipt Checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShareReceipt(!shareReceipt)}
              className="flex-row items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-6"
            >
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center ${
                  shareReceipt ? 'bg-[#0A6C50] border-[#0A6C50]' : 'border-slate-400 bg-white'
                }`}
              >
                {shareReceipt && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800">
                  Generate & Share PDF Receipt
                </Text>
                <Text className="text-[11px] text-slate-500">
                  Opens share sheet with branded PDF receipt upon confirmation
                </Text>
              </View>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || currentPayablePaise <= 0}
              className={`h-13 rounded-2xl items-center justify-center mb-6 shadow-md ${
                isSubmitting || currentPayablePaise <= 0 ? 'bg-slate-300' : 'bg-[#0A6C50]'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-black text-base">
                  Confirm Received {formatINR(currentPayablePaise)}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
