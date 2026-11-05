import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Sparkles, AlertCircle, ShieldCheck, Clock, ArrowDownCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCurrentSubscriptionApi,
  scheduleDowngradeApi,
  cancelDowngradeApi,
} from '../api/subscription';
import { useAuth } from '../hooks/useAuth';
import { useProperties } from '../context/PropertyContext';
import { ISubscriptionCurrent } from '../types/api';
import { calculateDaysRemaining } from '../utils/date';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

const PLAN_TIER_RANK: Record<'starter' | 'growth' | 'pro', number> = {
  starter: 1,
  growth: 2,
  pro: 3,
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { subscription: authSub, refreshAuthUser } = useAuth();
  const { properties } = useProperties();
  const [sub, setSub] = useState<ISubscriptionCurrent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCancelingDowngrade, setIsCancelingDowngrade] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'starter' | 'growth' | 'pro' | null>(null);

  const loadSub = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentSubscriptionApi();
      setSub(data);
    } catch {
      // Fallback from auth context and properties
      const totalBedsInProps = properties.reduce((acc, p) => acc + (p.stats?.totalBeds || 0), 0);
      const daysLeft = authSub?.trialEndsAt ? calculateDaysRemaining(authSub.trialEndsAt) : 14;

      setSub(
        prev =>
          prev || {
            plan: (authSub?.plan as 'starter' | 'growth' | 'pro') || 'starter',
            status: authSub?.status || 'trialing',
            isReadOnly: false,
            daysLeft,
            trialEndsAt: authSub?.trialEndsAt || new Date(Date.now() + 14 * 86400000).toISOString(),
            currentPeriodEnd:
              authSub?.currentPeriodEnd || new Date(Date.now() + 14 * 86400000).toISOString(),
            maxProperties: authSub?.maxProperties || 1,
            maxBeds: authSub?.maxBeds || 30,
            propertiesUsed: properties.length || 1,
            bedsUsed: totalBedsInProps,
            upgradeUrl: '',
          },
      );
    } finally {
      setIsLoading(false);
    }
  }, [properties, authSub]);

  useEffect(() => {
    if (visible) {
      loadSub();
    }
  }, [visible, loadSub]);

  const handleUpgrade = (plan: 'starter' | 'growth' | 'pro') => {
    setCheckoutPlan(plan);
  };

  const handleScheduleDowngrade = (targetPlan: 'starter' | 'growth' | 'pro') => {
    const targetTitle =
      targetPlan === 'starter' ? 'Starter' : targetPlan === 'growth' ? 'Growth' : 'Pro';
    const effectiveDateStr = sub?.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'the end of your current cycle';

    Alert.alert(
      `Schedule Downgrade to ${targetTitle}?`,
      `Your account will transition to ${targetTitle} on ${effectiveDateStr}.\n\n• Full ${sub?.plan?.toUpperCase()} access remains active until then.\n• All existing properties, rooms, beds, and tenant data remain 100% intact.\n• You can continue collecting rent and managing tenants without disruption.\n• Only new additions beyond ${targetTitle} limits will be paused after cycle end.`,
      [
        { text: 'Keep Current Plan', style: 'cancel' },
        {
          text: 'Schedule Downgrade',
          style: 'destructive',
          onPress: async () => {
            setIsScheduling(true);
            try {
              await scheduleDowngradeApi(targetPlan);
              Alert.alert(
                'Downgrade Scheduled',
                `Your plan will switch to ${targetTitle} on ${effectiveDateStr}. All existing data and operations remain active.`,
              );
              await loadSub();
              await refreshAuthUser();
              queryClient.invalidateQueries({ queryKey: ['subscription'] });
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err instanceof Error ? err.message : 'Failed to schedule downgrade');
              Alert.alert('Downgrade Error', msg);
            } finally {
              setIsScheduling(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelDowngrade = async () => {
    setIsCancelingDowngrade(true);
    try {
      await cancelDowngradeApi();
      Alert.alert(
        'Downgrade Canceled',
        'Your scheduled downgrade has been canceled. Your current plan will continue normally.',
      );
      await loadSub();
      await refreshAuthUser();
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to cancel downgrade');
      Alert.alert('Error', msg);
    } finally {
      setIsCancelingDowngrade(false);
    }
  };

  if (!visible) return null;

  const isExpired = sub?.isReadOnly || sub?.status === 'expired';
  const currentPlan = (sub?.plan || 'starter') as 'starter' | 'growth' | 'pro';
  const currentRank = PLAN_TIER_RANK[currentPlan] || 1;
  const isActivePaid = sub?.status === 'active';
  const isTrialing = sub?.status === 'trialing';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#F8F9FA]">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
          <View>
            <Text className="text-xl font-extrabold text-slate-900">Subscription & Limits</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-0.5">
              Plan quotas, upgrades & billing cycles
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 text-sm font-medium mt-3">Loading plan status…</Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* Read-Only Alert Banner if expired */}
            {isExpired && (
              <View className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex-row items-start">
                <AlertCircle size={20} color="#BE123C" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-extrabold text-rose-900">
                    Trial Expired · Read-Only Mode
                  </Text>
                  <Text className="text-xs text-rose-700 mt-0.5">
                    Your account is currently in read-only mode. You can view all your properties
                    and tenants. Choose a plan below to resume check-ins, adding rooms, and
                    recording payments.
                  </Text>
                </View>
              </View>
            )}

            {/* Scheduled Downgrade Banner if active */}
            {sub?.scheduledPlan && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <View className="flex-row items-start">
                  <Clock size={20} color="#D97706" />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-extrabold text-amber-900 capitalize">
                      Downgrade to {sub.scheduledPlan} Scheduled
                    </Text>
                    <Text className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Takes effect on{' '}
                      <Text className="font-bold">
                        {sub.scheduledPlanEffectiveAt
                          ? new Date(sub.scheduledPlanEffectiveAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'end of billing period'}
                      </Text>
                      . Full {currentPlan.toUpperCase()} privileges and all existing beds remain
                      active until then.
                    </Text>
                    <Text className="text-[11px] text-amber-700 font-medium mt-1">
                      Zero disruption: All existing properties, tenants, and rent collection remain
                      untouched.
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                      className="mt-3 bg-amber-600 self-start px-3.5 py-1.5 rounded-lg active:opacity-85"
                    >
                      {isCancelingDowngrade ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white text-xs font-bold">Cancel Downgrade</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Current Plan Hero */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-5 shadow-xs">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Current Plan
                  </Text>
                  <Text className="text-2xl font-black text-slate-900 capitalize">
                    {sub?.plan || 'Starter'} Tier
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full border ${
                    isExpired
                      ? 'bg-rose-50 border-rose-200'
                      : sub?.status === 'active'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-extrabold uppercase ${
                      isExpired
                        ? 'text-rose-700'
                        : sub?.status === 'active'
                          ? 'text-[#0A6C50]'
                          : 'text-amber-800'
                    }`}
                  >
                    {isExpired
                      ? 'Expired (Read-only)'
                      : sub?.status === 'active'
                        ? `Active · ${sub?.daysLeft || 0}d left`
                        : `${sub?.daysLeft || 0}d Trial`}
                  </Text>
                </View>
              </View>

              {/* Resource meters */}
              <View className="pt-3 border-t border-slate-100">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700">Properties Registered</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {sub?.propertiesUsed || 0} /{' '}
                    {sub?.maxProperties && sub.maxProperties > 50
                      ? 'Unlimited'
                      : sub?.maxProperties || 1}
                  </Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <View
                    className="h-full bg-[#0A6C50] rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((sub?.propertiesUsed || 0) / (sub?.maxProperties || 1)) * 100,
                      )}%`,
                    }}
                  />
                </View>

                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700">Total Bed Capacity</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {sub?.bedsUsed || 0} /{' '}
                    {sub?.maxBeds && sub.maxBeds > 500 ? 'Unlimited' : sub?.maxBeds || 30}
                  </Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-[#0A6C50] rounded-full"
                    style={{
                      width: `${Math.min(100, ((sub?.bedsUsed || 0) / (sub?.maxBeds || 30)) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Proration & Policy Note */}
            <View className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 flex-row items-center">
              <Sparkles size={16} color="#0A6C50" />
              <Text className="text-[11px] text-slate-600 font-medium ml-2.5 flex-1 leading-relaxed">
                <Text className="font-bold text-slate-800">Value-Based Proration:</Text> Upgrades
                convert unused days into bonus days immediately. Downgrades take effect safely at
                the end of the billing period without interrupting existing beds.
              </Text>
            </View>

            {/* Upgrade Options */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Available Plans
            </Text>

            {/* Starter Tier */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-4 shadow-xs">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-black text-slate-900">Starter Plan</Text>
                <Text className="text-lg font-black text-slate-700">₹499 / mo</Text>
              </View>
              <Text className="text-xs text-slate-500 font-medium mb-3">
                Ideal for single-property PG owners starting out (Includes 14-day free trial)
              </Text>
              <View className="space-y-1 mb-4">
                <Text className="text-xs text-slate-700 font-semibold">
                  • 1 Property (up to 30 Beds)
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Quick Tenant Check-in & Auto-Rent Invoicing
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Visual Matrix Grid & Payment Ledger
                </Text>
              </View>

              {/* Starter Action Button */}
              {isTrialing && currentPlan === 'starter' ? (
                <View className="space-y-2">
                  <View className="bg-emerald-50 rounded-xl py-2 items-center justify-center border border-emerald-200">
                    <Text className="text-[#0A6C50] font-black text-xs">
                      14-DAY TRIAL ACTIVE ({sub?.daysLeft || 0} DAYS LEFT)
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUpgrade('starter')}
                    className="bg-slate-800 rounded-xl py-2.5 items-center justify-center"
                  >
                    <Text className="text-white font-bold text-xs">
                      Purchase Paid Starter (Preserves Trial + 30 Days)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isActivePaid && currentPlan === 'starter' ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('starter')}
                  className="bg-slate-800 rounded-xl py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">
                    Renew Starter Plan (+30 Days)
                  </Text>
                </TouchableOpacity>
              ) : isActivePaid && currentRank > 1 ? (
                // Current user is Growth or Pro -> Downgrade option
                sub?.scheduledPlan === 'starter' ? (
                  <View className="bg-amber-50 rounded-xl py-2.5 px-3 border border-amber-200 flex-row items-center justify-between">
                    <Text className="text-amber-800 font-bold text-xs">
                      Scheduled for Cycle End
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                    >
                      <Text className="text-amber-900 font-extrabold text-xs underline">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleScheduleDowngrade('starter')}
                    disabled={isScheduling}
                    className="bg-slate-100 border border-slate-300 rounded-xl py-3 items-center justify-center"
                  >
                    <View className="flex-row items-center">
                      <ArrowDownCircle size={15} color="#475569" />
                      <Text className="text-slate-700 font-bold text-sm ml-1.5">
                        Schedule Downgrade (At Cycle End)
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('starter')}
                  className="bg-slate-800 rounded-xl py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">
                    {isExpired ? 'Reactivate on Starter' : 'Switch to Starter'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Growth Tier */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-4 shadow-xs">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-black text-slate-900">Growth Plan</Text>
                <Text className="text-lg font-black text-[#0A6C50]">₹999 / mo</Text>
              </View>
              <Text className="text-xs text-slate-500 font-medium mb-3">
                For expanding owners managing up to 3 PG branches
              </Text>
              <View className="space-y-1 mb-4">
                <Text className="text-xs text-slate-700 font-semibold">
                  • Up to 3 Properties (100 Beds)
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Multi-staff & manager logins
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Sub-meter EB reading splits
                </Text>
              </View>

              {/* Growth Action Button */}
              {isActivePaid && currentPlan === 'growth' ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('growth')}
                  className="bg-[#0A6C50] rounded-xl py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">Renew Growth Plan (+30 Days)</Text>
                </TouchableOpacity>
              ) : isActivePaid && currentRank > 2 ? (
                // Current user is Pro -> Downgrade option
                sub?.scheduledPlan === 'growth' ? (
                  <View className="bg-amber-50 rounded-xl py-2.5 px-3 border border-amber-200 flex-row items-center justify-between">
                    <Text className="text-amber-800 font-bold text-xs">
                      Scheduled for Cycle End
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                    >
                      <Text className="text-amber-900 font-extrabold text-xs underline">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleScheduleDowngrade('growth')}
                    disabled={isScheduling}
                    className="bg-slate-100 border border-slate-300 rounded-xl py-3 items-center justify-center"
                  >
                    <View className="flex-row items-center">
                      <ArrowDownCircle size={15} color="#475569" />
                      <Text className="text-slate-700 font-bold text-sm ml-1.5">
                        Schedule Downgrade (At Cycle End)
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('growth')}
                  className="bg-[#0A6C50] rounded-xl py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">
                    {currentRank < 2 ? 'Upgrade to Growth (Prorated)' : 'Switch to Growth'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pro Tier */}
            <View
              className={`bg-white rounded-2xl p-5 border mb-6 shadow-xs ${
                currentPlan === 'pro' && isActivePaid
                  ? 'border-purple-400 bg-purple-50/20'
                  : 'border-purple-200'
              }`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                  <Sparkles size={16} color="#7E22CE" />
                  <Text className="text-lg font-black text-slate-900 ml-1.5">Pro Enterprise</Text>
                  {currentPlan === 'pro' && isActivePaid && (
                    <View className="ml-2 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-extrabold text-purple-800">ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text className="text-lg font-black text-purple-700">₹1,999 / mo</Text>
              </View>
              <Text className="text-xs text-slate-500 font-medium mb-3">
                Unlimited properties and high-volume multi-floor hostel chains
              </Text>
              <View className="space-y-1 mb-4">
                <Text className="text-xs text-slate-700 font-semibold">
                  • Unlimited Properties & Beds
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Priority phone & WhatsApp support
                </Text>
                <Text className="text-xs text-slate-700 font-semibold">
                  • Custom receipt branding & reports
                </Text>
              </View>

              {/* Pro Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleUpgrade('pro')}
                className="bg-purple-700 rounded-xl py-3 items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">
                  {currentPlan === 'pro' && isActivePaid
                    ? 'Extend Pro Plan (+30 Days)'
                    : 'Upgrade to Pro (Prorated)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Razorpay Trust Badge */}
            <View className="flex-row items-center justify-center py-3 mb-6 bg-slate-50 rounded-xl border border-slate-200/80">
              <ShieldCheck size={14} color="#0A6C50" />
              <Text className="text-xs font-bold text-slate-600 ml-1.5">
                Secured by Razorpay · UPI, Cards & NetBanking
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Razorpay Checkout Modal */}
        <RazorpayCheckoutModal
          visible={checkoutPlan !== null}
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={async upgradedPlan => {
            setCheckoutPlan(null);
            onClose(); // Close SubscriptionModal completely
            await refreshAuthUser();
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            router.push({
              pathname: '/subscription' as any,
              params: { status: 'success', plan: upgradedPlan || 'pro' },
            });
          }}
        />
      </View>
    </Modal>
  );
};
