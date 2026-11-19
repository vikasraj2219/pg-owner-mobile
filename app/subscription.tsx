import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Building2,
  BedDouble,
  RefreshCw,
  ArrowRight,
  Clock,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentSubscriptionApi, cancelDowngradeApi } from '../src/api/subscription';
import { useAuth } from '../src/context/AuthContext';
import { useProperties } from '../src/context/PropertyContext';
import { ISubscriptionCurrent } from '../src/types/api';
import { calculateDaysRemaining } from '../src/utils/date';
import { SubscriptionModal } from '../src/components/SubscriptionModal';

export default function SubscriptionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { subscription: authSub, refreshAuthUser } = useAuth();
  const { properties } = useProperties();

  const {
    status,
    plan: queryPlan,
    payment_id,
  } = useLocalSearchParams<{
    status?: string;
    plan?: string;
    payment_id?: string;
  }>();

  const [sub, setSub] = useState<ISubscriptionCurrent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelingDowngrade, setIsCancelingDowngrade] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const isLoadedRef = React.useRef(false);

  const loadSubscription = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsRefreshing(true);
      } else if (!isLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        // Invalidate queries so dashboard and properties get fresh quotas
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });

        // Refresh auth user context
        await refreshAuthUser();

        // Fetch fresh subscription
        const data = await getCurrentSubscriptionApi();
        setSub(data);
      } catch {
        // Fallback state
        const totalBedsInProps = properties.reduce((acc, p) => acc + (p.stats?.totalBeds || 0), 0);
        const daysLeft = authSub?.trialEndsAt ? calculateDaysRemaining(authSub.trialEndsAt) : 14;

        setSub(
          prev =>
            prev || {
              plan: (authSub?.plan as 'starter' | 'growth' | 'pro') || 'starter',
              status: authSub?.status || 'trialing',
              isReadOnly: false,
              daysLeft,
              trialEndsAt:
                authSub?.trialEndsAt || new Date(Date.now() + 14 * 86400000).toISOString(),
              currentPeriodEnd:
                authSub?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
              maxProperties: authSub?.maxProperties || 1,
              maxBeds: authSub?.maxBeds || 30,
              propertiesUsed: properties.length || 1,
              bedsUsed: totalBedsInProps,
              upgradeUrl: '',
            },
        );
      } finally {
        isLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [queryClient, refreshAuthUser, properties, authSub],
  );

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleRefresh = () => {
    loadSubscription(true);
  };

  const handleCancelDowngrade = async () => {
    setIsCancelingDowngrade(true);
    try {
      await cancelDowngradeApi();
      Alert.alert(
        'Downgrade Canceled',
        'Your scheduled downgrade has been canceled. Your current plan will renew normally.',
      );
      await loadSubscription(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to cancel downgrade');
      Alert.alert('Error', msg);
    } finally {
      setIsCancelingDowngrade(false);
    }
  };

  const handleNavigateHome = () => {
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const isSuccess = status === 'success' || sub?.status === 'active';
  const isFailed = status === 'failed' || status === 'cancelled';

  const planName = (sub?.plan || queryPlan || 'starter').toUpperCase();

  const getPlanTitle = (p: string) => {
    switch (p.toLowerCase()) {
      case 'pro':
        return 'Pro Enterprise';
      case 'growth':
        return 'Growth Tier';
      default:
        return 'Starter Plan';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF5EB" />

      {/* Navigation Header */}
      <View
        style={{
          backgroundColor: '#FAF5EB',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
        }}
        className="px-5 py-3.5 flex-row items-center justify-between"
      >
        <TouchableOpacity
          onPress={handleBack}
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
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
        </TouchableOpacity>
        <Text style={{ color: '#0C192B' }} className="text-base font-extrabold">
          Subscription & Access
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
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
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#4F5330" />
          ) : (
            <RefreshCw size={18} color="#0C192B" />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F5330" />
          <Text style={{ color: '#657080' }} className="font-semibold text-sm mt-3">
            Confirming subscription status…
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
          {/* Status Banner */}
          {isFailed ? (
            <View
              style={{ backgroundColor: '#FDF1F1', borderColor: '#F9CACA' }}
              className="border rounded-3xl p-6 mb-5 items-center text-center"
            >
              <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center mb-3">
                <AlertCircle size={36} color="#DC2626" />
              </View>
              <Text
                style={{ color: '#0C192B' }}
                className="text-xl font-extrabold mb-1 text-center"
              >
                Payment Incomplete
              </Text>
              <Text
                style={{ color: '#657080' }}
                className="text-xs text-center leading-relaxed mb-4"
              >
                The payment was not completed or could not be verified. If your bank account was
                debited, it will be refunded or credited automatically.
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(true)}
                activeOpacity={0.85}
                style={{ backgroundColor: '#4F5330', borderRadius: 9999, height: 48 }}
                className="w-full items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Retry Subscription Upgrade</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{ backgroundColor: '#FFFDF8', borderColor: '#E5DDCD' }}
              className="border rounded-3xl p-6 mb-5 items-center shadow-xs"
            >
              <View
                style={{ backgroundColor: '#FAF5EB' }}
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
              >
                <CheckCircle2 size={38} color="#4F5330" />
              </View>
              <View
                style={{ backgroundColor: '#EAF7EE', borderColor: '#B2E7C3' }}
                className="px-3.5 py-1 rounded-full mb-2 border"
              >
                <Text className="text-[#0A6C50] text-[11px] font-black uppercase tracking-wider">
                  {sub?.status === 'active' ? 'Active Membership' : 'Trial Active'}
                </Text>
              </View>
              <Text style={{ color: '#0C192B' }} className="text-2xl font-black mb-1 text-center">
                {isSuccess && status === 'success'
                  ? 'Payment Confirmed! 🎉'
                  : `${getPlanTitle(sub?.plan || 'starter')} Active`}
              </Text>
              <Text style={{ color: '#657080' }} className="text-xs font-semibold text-center mb-4">
                {sub?.status === 'active'
                  ? `Your organization is unlocked on the ${getPlanTitle(sub?.plan || 'starter')} with ${sub?.daysLeft || 30} days of full active access.`
                  : `${sub?.daysLeft || 0} days remaining on your free starter trial.`}
              </Text>

              {payment_id ? (
                <View className="bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 mb-2">
                  <Text className="text-[11px] font-mono font-medium text-slate-500">
                    Ref ID: {payment_id}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Scheduled Downgrade Notice Card */}
          {sub?.scheduledPlan && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 shadow-xs">
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mr-3 mt-0.5">
                  <Clock size={18} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-amber-900 capitalize">
                    Downgrade to {sub.scheduledPlan} Scheduled
                  </Text>
                  <Text className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your tier will transition to{' '}
                    <Text className="font-bold">{getPlanTitle(sub.scheduledPlan)}</Text> on{' '}
                    <Text className="font-bold">
                      {sub.scheduledPlanEffectiveAt
                        ? new Date(sub.scheduledPlanEffectiveAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'end of billing period'}
                    </Text>
                    .
                  </Text>
                  <Text className="text-[11px] text-amber-700 font-medium mt-1.5 leading-relaxed">
                    ✓ All existing properties, rooms, beds, and tenant rent collections remain 100%
                    active and protected.
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

          {/* Current Quotas Card */}
          <View
            style={{ backgroundColor: '#FFFDF8', borderColor: '#E5DDCD' }}
            className="rounded-2xl p-5 border mb-5 shadow-xs"
          >
            <View
              style={{ borderBottomColor: '#FAF5EB' }}
              className="flex-row items-center justify-between mb-4 pb-3 border-b"
            >
              <View className="flex-row items-center">
                <Sparkles size={18} color="#4F5330" />
                <Text style={{ color: '#0C192B' }} className="text-sm font-black ml-2">
                  Plan Quota & Capacity
                </Text>
              </View>
              <View
                style={{ backgroundColor: '#FAF5EB', borderWidth: 1, borderColor: '#E5DDCD' }}
                className="px-2.5 py-0.5 rounded-full"
              >
                <Text
                  style={{ color: '#0C192B' }}
                  className="text-[10px] font-extrabold tracking-wider"
                >
                  {planName}
                </Text>
              </View>
            </View>

            {/* Properties Meter */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <View className="flex-row items-center">
                  <Building2 size={15} color="#657080" />
                  <Text style={{ color: '#657080' }} className="text-xs font-bold ml-1.5">
                    Properties Managed
                  </Text>
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-black">
                  {sub?.propertiesUsed || 0} /{' '}
                  {sub?.maxProperties && sub.maxProperties > 50
                    ? 'Unlimited'
                    : sub?.maxProperties || 1}
                </Text>
              </View>
              <View
                style={{ backgroundColor: '#FAF5EB' }}
                className="h-2 rounded-full overflow-hidden"
              >
                <View
                  style={{
                    backgroundColor: '#4F5330',
                    width: `${Math.min(
                      100,
                      ((sub?.propertiesUsed || 0) / (sub?.maxProperties || 1)) * 100,
                    )}%`,
                  }}
                  className="h-full rounded-full"
                />
              </View>
            </View>

            {/* Beds Meter */}
            <View className="mb-2">
              <View className="flex-row justify-between items-center mb-1.5">
                <View className="flex-row items-center">
                  <BedDouble size={15} color="#657080" />
                  <Text style={{ color: '#657080' }} className="text-xs font-bold ml-1.5">
                    Bed Capacity
                  </Text>
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-black">
                  {sub?.bedsUsed || 0} /{' '}
                  {sub?.maxBeds && sub.maxBeds > 500 ? 'Unlimited' : sub?.maxBeds || 30}
                </Text>
              </View>
              <View
                style={{ backgroundColor: '#FAF5EB' }}
                className="h-2 rounded-full overflow-hidden"
              >
                <View
                  style={{
                    backgroundColor: '#4F5330',
                    width: `${Math.min(100, ((sub?.bedsUsed || 0) / (sub?.maxBeds || 30)) * 100)}%`,
                  }}
                  className="h-full rounded-full"
                />
              </View>
            </View>

            {/* If Downgrade Scheduled, show future limit reassurance */}
            {sub?.scheduledPlan && (
              <View style={{ borderTopColor: '#FAF5EB' }} className="mt-3 pt-3 border-t">
                <Text style={{ color: '#657080' }} className="text-[11px] font-medium">
                  • After cycle end, future new additions will be capped at{' '}
                  <Text style={{ color: '#0C192B' }} className="font-bold">
                    {sub.scheduledPlan === 'starter'
                      ? '1 Property / 30 Beds'
                      : '3 Properties / 100 Beds'}
                  </Text>
                  . Existing occupied beds will never be removed.
                </Text>
              </View>
            )}
          </View>

          {/* Features Unlocked List */}
          <View
            style={{ backgroundColor: '#FFFDF8', borderColor: '#E5DDCD' }}
            className="rounded-2xl p-5 border mb-6 shadow-xs"
          >
            <Text
              style={{ color: '#657080' }}
              className="text-xs font-bold uppercase tracking-wider mb-3"
            >
              Included In Your Membership
            </Text>
            <View className="space-y-2.5">
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: '#FAF5EB' }}
                  className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                >
                  <CheckCircle2 size={13} color="#4F5330" />
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-semibold">
                  Multi-property occupancy matrix & floor plan grid
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: '#FAF5EB' }}
                  className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                >
                  <CheckCircle2 size={13} color="#4F5330" />
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-semibold">
                  Automated rent cycles, late fee calculators & dynamic UPI QR
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: '#FAF5EB' }}
                  className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                >
                  <CheckCircle2 size={13} color="#4F5330" />
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-semibold">
                  Secure tenant ID proof storage & document management
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: '#FAF5EB' }}
                  className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                >
                  <CheckCircle2 size={13} color="#4F5330" />
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-semibold">
                  Sub-meter electricity meter readings & split calculation
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{ backgroundColor: '#FAF5EB' }}
                  className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                >
                  <CheckCircle2 size={13} color="#4F5330" />
                </View>
                <Text style={{ color: '#0C192B' }} className="text-xs font-semibold">
                  Instant WhatsApp payment receipt links & tenant reminders
                </Text>
              </View>
            </View>
          </View>

          {/* Action CTAs */}
          <TouchableOpacity
            onPress={handleNavigateHome}
            activeOpacity={0.85}
            style={{ backgroundColor: '#4F5330', borderRadius: 9999, height: 50 }}
            className="flex-row items-center justify-center mb-3 shadow-sm"
          >
            <Text className="text-white font-extrabold text-sm mr-2">Go to Pulse Dashboard</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowModal(true)}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 9999,
              height: 50,
            }}
            className="items-center justify-center mb-6"
          >
            <Text style={{ color: '#0C192B' }} className="font-bold text-sm">
              Manage / Upgrade Plan
            </Text>
          </TouchableOpacity>

          {/* Trust Footnote */}
          <View className="flex-row items-center justify-center pb-6">
            <ShieldCheck size={14} color="#657080" />
            <Text style={{ color: '#657080' }} className="text-xs font-medium ml-1.5">
              Secured by Razorpay · Enterprise Grade Multi-Tenant Encryption
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Subscription Plans Modal */}
      <SubscriptionModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          loadSubscription(true);
        }}
      />
    </SafeAreaView>
  );
}
