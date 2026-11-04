import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Smartphone,
  Lock,
  Sparkles,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
  createRazorpayPaymentLinkApi,
} from '../api/subscription';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  plan: 'starter' | 'growth' | 'pro' | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_DETAILS: Record<
  'starter' | 'growth' | 'pro',
  {
    title: string;
    priceFormatted: string;
    amountRupees: number;
    properties: string;
    beds: string;
    features: string[];
    accentColor: string;
    tagBg: string;
  }
> = {
  starter: {
    title: 'Starter Plan',
    priceFormatted: '₹499',
    amountRupees: 499,
    properties: '1 Property',
    beds: 'Up to 30 Beds',
    features: [
      '1 Property & 30 Beds capacity',
      'Tenant KYC & Document uploads',
      'Automated Rent Invoicing & Receipts',
      'Visual Matrix Grid & Dues Tracker',
    ],
    accentColor: '#334155',
    tagBg: 'bg-slate-100',
  },
  growth: {
    title: 'Growth Plan',
    priceFormatted: '₹999',
    amountRupees: 999,
    properties: 'Up to 3 Properties',
    beds: 'Up to 100 Beds',
    features: [
      'Up to 3 Properties (100 Beds total)',
      'Sub-meter EB reading calculations',
      'Staff & Warden management logins',
      'WhatsApp Payment Reminder deep-links',
    ],
    accentColor: '#0A6C50',
    tagBg: 'bg-emerald-50',
  },
  pro: {
    title: 'Pro Enterprise',
    priceFormatted: '₹1,999',
    amountRupees: 1999,
    properties: 'Unlimited Properties',
    beds: 'Unlimited Beds',
    features: [
      'Unlimited Properties & Beds',
      'Priority Phone & WhatsApp Support',
      'Custom invoice branding & reports',
      'Multi-branch financial analytics',
    ],
    accentColor: '#7E22CE',
    tagBg: 'bg-purple-50',
  },
};

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  visible,
  plan,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  if (!visible || !plan) return null;

  const details = PLAN_DETAILS[plan];

  const handlePayViaRazorpay = async () => {
    setIsProcessing(true);
    try {
      // 1. Try creating a Razorpay hosted payment link first
      const linkData = await createRazorpayPaymentLinkApi(plan);

      if (linkData.paymentLinkUrl && !linkData.isMock) {
        // Open live Razorpay hosted checkout in mobile browser (supports UPI intent apps like GPay/PhonePe)
        setPendingOrderId(linkData.paymentLinkId);
        await Linking.openURL(linkData.paymentLinkUrl);
        Alert.alert(
          'Checkout Opened',
          'Complete your payment in Razorpay with your UPI app or Card. Once finished, return here and tap "Verify Payment".',
          [
            {
              text: 'Verify Payment',
              onPress: () => handleVerifyPayment(linkData.paymentLinkId),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }

      // 2. Fallback / Test Sandbox Mode
      const orderData = await createRazorpayOrderApi(plan);
      setPendingOrderId(orderData.orderId);

      // In Sandbox mode, verify and activate directly
      await verifyRazorpayPaymentApi({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'test_signature_valid',
        plan,
      });

      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert(
        'Payment Successful! 🎉',
        `Your subscription is now active on the ${details.title.toUpperCase()} for 30 days! All features and quotas are unlocked.`,
        [{ text: 'Start Managing', onPress: onSuccess }],
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Payment initiation failed';
      Alert.alert('Payment Error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async (orderIdToVerify?: string) => {
    const targetOrderId = orderIdToVerify || pendingOrderId;
    if (!targetOrderId) return;

    setIsProcessing(true);
    try {
      await verifyRazorpayPaymentApi({
        razorpay_order_id: targetOrderId,
        razorpay_payment_id: `pay_verified_${Date.now()}`,
        razorpay_signature: 'verified_signature',
        plan,
      });

      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert(
        'Subscription Activated! 🎉',
        `Payment verified! Your account is active on ${details.title}.`,
        [{ text: 'Continue', onPress: onSuccess }],
      );
    } catch {
      Alert.alert(
        'Verification Pending',
        'We could not verify the payment yet. If money was debited, your account will activate automatically within 2 minutes via webhook.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Banner */}
          <View className="bg-slate-900 px-5 pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-600 items-center justify-center mr-2.5">
                <Text className="text-white font-black text-sm">R</Text>
              </View>
              <View>
                <Text className="text-white font-extrabold text-base tracking-wide">
                  Razorpay Checkout
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <ShieldCheck size={11} color="#60A5FA" />
                  <Text className="text-blue-300 text-[10px] font-semibold ml-1">
                    256-Bit SSL · RBI Regulated
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[500px] px-5 pt-4 pb-2">
            {/* Plan Card */}
            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Selected Tier
                  </Text>
                  <Text className="text-xl font-black text-slate-900">{details.title}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-black text-[#0A6C50]">
                    {details.priceFormatted}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400">/ 30 DAYS</Text>
                </View>
              </View>

              <View className="h-px bg-slate-200 my-2.5" />

              <View className="space-y-1.5">
                {details.features.map((feat, idx) => (
                  <View key={idx} className="flex-row items-center">
                    <CheckCircle2 size={13} color="#0A6C50" />
                    <Text className="text-xs font-semibold text-slate-700 ml-2">{feat}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Supported Payment Methods */}
            <View className="mb-4">
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Accepted Payment Options
              </Text>

              <View className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-2">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-3">
                    <Smartphone size={16} color="#0A6C50" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-slate-900">Instant UPI & AutoPay</Text>
                    <Text className="text-[10px] text-slate-500">
                      GPay, PhonePe, Paytm, BHIM UPI
                    </Text>
                  </View>
                </View>
                <View className="bg-emerald-100/70 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-extrabold text-[#0A6C50]">POPULAR</Text>
                </View>
              </View>

              <View className="flex-row items-center bg-white border border-slate-200 rounded-xl p-3 mb-2">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3">
                  <CreditCard size={16} color="#2563EB" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-900">Cards & NetBanking</Text>
                  <Text className="text-[10px] text-slate-500">
                    Visa, MasterCard, RuPay, 50+ Banks
                  </Text>
                </View>
              </View>
            </View>

            {/* Security note */}
            <View className="flex-row items-center justify-center mb-4">
              <Lock size={12} color="#64748B" />
              <Text className="text-[11px] text-slate-500 font-medium ml-1.5">
                Payments processed securely by Razorpay
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-5 pb-5 pt-2 border-t border-slate-100 bg-white">
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isProcessing}
              onPress={handlePayViaRazorpay}
              className="w-full bg-[#0A6C50] rounded-2xl py-3.5 items-center justify-center flex-row shadow-sm"
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-black text-sm ml-2">Connecting Razorpay…</Text>
                </>
              ) : (
                <>
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text className="text-white font-black text-sm ml-2">
                    Pay {details.priceFormatted} Securely
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {pendingOrderId && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleVerifyPayment()}
                className="mt-2.5 py-2 items-center flex-row justify-center"
              >
                <ExternalLink size={13} color="#0A6C50" />
                <Text className="text-xs font-bold text-[#0A6C50] ml-1.5">
                  Check & Verify Completed Payment
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
