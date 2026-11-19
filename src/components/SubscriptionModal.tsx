import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
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
import { ConfirmActionModal } from './ConfirmDeleteModal';

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
  const [downgradeConfirmation, setDowngradeConfirmation] = useState<{
    targetPlan: 'starter' | 'growth';
    targetTitle: string;
    effectiveDateStr: string;
  } | null>(null);

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
    if (targetPlan === 'pro') return;
    const targetTitle = targetPlan === 'starter' ? 'Starter' : 'Growth';
    const effectiveDateStr = sub?.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'the end of your current cycle';

    setDowngradeConfirmation({
      targetPlan,
      targetTitle,
      effectiveDateStr,
    });
  };

  const handleConfirmDowngrade = async () => {
    if (!downgradeConfirmation) return;
    const { targetPlan, targetTitle, effectiveDateStr } = downgradeConfirmation;
    setIsScheduling(true);
    try {
      await scheduleDowngradeApi(targetPlan);
      setDowngradeConfirmation(null);
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
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
              Subscription & Limits
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}>
              Plan quotas, upgrades & billing cycles
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#657080" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#4F5330" />
            <Text style={{ color: '#657080', fontSize: 13, fontWeight: '600', marginTop: 12 }}>
              Loading plan status…
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 26 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Read-Only Alert Banner if expired */}
            {isExpired && (
              <View
                style={{
                  backgroundColor: '#FFF1F2',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={20} color="#BE123C" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#BE123C' }}>
                    Trial Expired · Read-Only Mode
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9F1239', marginTop: 2, lineHeight: 16 }}>
                    Your account is currently in read-only mode. You can view all your properties
                    and tenants. Choose a plan below to resume check-ins, adding rooms, and
                    recording payments.
                  </Text>
                </View>
              </View>
            )}

            {/* Scheduled Downgrade Banner if active */}
            {sub?.scheduledPlan && (
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Clock size={20} color="#D97706" style={{ marginRight: 10, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: '#92400E',
                        textTransform: 'capitalize',
                      }}
                    >
                      Downgrade to {sub.scheduledPlan} Scheduled
                    </Text>
                    <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 16 }}>
                      Takes effect on{' '}
                      <Text style={{ fontWeight: '800' }}>
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
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                      activeOpacity={0.8}
                      style={{
                        marginTop: 10,
                        backgroundColor: '#D97706',
                        alignSelf: 'flex-start',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      {isCancelingDowngrade ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          Cancel Downgrade
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Current Plan Hero */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginBottom: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
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
                    Current Plan
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '800',
                      color: '#0C192B',
                      textTransform: 'capitalize',
                      marginTop: 2,
                    }}
                  >
                    {sub?.plan || 'Starter'} Tier
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: isExpired
                      ? '#FFF1F2'
                      : sub?.status === 'active'
                        ? '#FAF5EB'
                        : '#FEF3C7',
                    borderWidth: 1,
                    borderColor: isExpired
                      ? '#FECDD3'
                      : sub?.status === 'active'
                        ? '#E5DDCD'
                        : '#FDE68A',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: isExpired
                        ? '#BE123C'
                        : sub?.status === 'active'
                          ? '#4F5330'
                          : '#92400E',
                    }}
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
              <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FAF5EB' }}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>
                    Properties Registered
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
                    {sub?.propertiesUsed || 0} /{' '}
                    {sub?.maxProperties && sub.maxProperties > 50
                      ? 'Unlimited'
                      : sub?.maxProperties || 1}
                  </Text>
                </View>
                <View
                  style={{
                    height: 7,
                    backgroundColor: '#FAF5EB',
                    borderRadius: 9999,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      backgroundColor: '#4F5330',
                      borderRadius: 9999,
                      width: `${Math.min(
                        100,
                        ((sub?.propertiesUsed || 0) / (sub?.maxProperties || 1)) * 100,
                      )}%`,
                    }}
                  />
                </View>

                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>
                    Total Bed Capacity
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
                    {sub?.bedsUsed || 0} /{' '}
                    {sub?.maxBeds && sub.maxBeds > 500 ? 'Unlimited' : sub?.maxBeds || 30}
                  </Text>
                </View>
                <View
                  style={{
                    height: 7,
                    backgroundColor: '#FAF5EB',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      backgroundColor: '#4F5330',
                      borderRadius: 9999,
                      width: `${Math.min(100, ((sub?.bedsUsed || 0) / (sub?.maxBeds || 30)) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Proration & Policy Note */}
            <View
              style={{
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                padding: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Sparkles size={16} color="#4F5330" style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontSize: 11,
                  color: '#657080',
                  fontWeight: '500',
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                <Text style={{ fontWeight: '800', color: '#0C192B' }}>Value-Based Proration: </Text>
                Upgrades convert unused days into bonus days immediately. Downgrades take effect
                safely at the end of the billing period.
              </Text>
            </View>

            {/* Upgrade Options */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Available Plans
            </Text>

            {/* Starter Tier */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                  Starter Plan
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>₹499 / mo</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginBottom: 10 }}>
                Ideal for single-property PG owners starting out (Includes 14-day free trial)
              </Text>
              <View style={{ gap: 4, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • 1 Property (up to 30 Beds)
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Quick Tenant Check-in & Auto-Rent Invoicing
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Visual Matrix Grid & Payment Ledger
                </Text>
              </View>

              {/* Starter Action Button */}
              {isTrialing && currentPlan === 'starter' ? (
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: '#FAF5EB',
                      borderRadius: 12,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                    }}
                  >
                    <Text style={{ color: '#4F5330', fontWeight: '800', fontSize: 11 }}>
                      14-DAY TRIAL ACTIVE ({sub?.daysLeft || 0} DAYS LEFT)
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleUpgrade('starter')}
                    style={{
                      backgroundColor: '#4F5330',
                      borderRadius: 9999,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                      Purchase Paid Starter (Preserves Trial + 30 Days)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isActivePaid && currentPlan === 'starter' ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('starter')}
                  style={{
                    backgroundColor: '#4F5330',
                    borderRadius: 9999,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Renew Starter Plan (+30 Days)
                  </Text>
                </TouchableOpacity>
              ) : isActivePaid && currentRank > 1 ? (
                sub?.scheduledPlan === 'starter' ? (
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>
                      Scheduled for Cycle End
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                    >
                      <Text
                        style={{
                          color: '#92400E',
                          fontWeight: '800',
                          fontSize: 12,
                          textDecorationLine: 'underline',
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleScheduleDowngrade('starter')}
                    disabled={isScheduling}
                    style={{
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 9999,
                      height: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    <ArrowDownCircle size={15} color="#657080" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#0C192B', fontWeight: '700', fontSize: 13 }}>
                      Schedule Downgrade (At Cycle End)
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('starter')}
                  style={{
                    backgroundColor: '#4F5330',
                    borderRadius: 9999,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {isExpired ? 'Reactivate on Starter' : 'Switch to Starter'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Growth Tier */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                  Growth Plan
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#4F5330' }}>₹999 / mo</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginBottom: 10 }}>
                For expanding owners managing up to 3 PG branches
              </Text>
              <View style={{ gap: 4, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Up to 3 Properties (100 Beds)
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Multi-staff & manager logins
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Sub-meter EB reading splits
                </Text>
              </View>

              {/* Growth Action Button */}
              {isActivePaid && currentPlan === 'growth' ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('growth')}
                  style={{
                    backgroundColor: '#4F5330',
                    borderRadius: 9999,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Renew Growth Plan (+30 Days)
                  </Text>
                </TouchableOpacity>
              ) : isActivePaid && currentRank > 2 ? (
                sub?.scheduledPlan === 'growth' ? (
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>
                      Scheduled for Cycle End
                    </Text>
                    <TouchableOpacity
                      onPress={handleCancelDowngrade}
                      disabled={isCancelingDowngrade}
                    >
                      <Text
                        style={{
                          color: '#92400E',
                          fontWeight: '800',
                          fontSize: 12,
                          textDecorationLine: 'underline',
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleScheduleDowngrade('growth')}
                    disabled={isScheduling}
                    style={{
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 9999,
                      height: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    <ArrowDownCircle size={15} color="#657080" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#0C192B', fontWeight: '700', fontSize: 13 }}>
                      Schedule Downgrade (At Cycle End)
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleUpgrade('growth')}
                  style={{
                    backgroundColor: '#4F5330',
                    borderRadius: 9999,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {currentRank < 2 ? 'Upgrade to Growth (Prorated)' : 'Switch to Growth'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pro Tier */}
            <View
              style={{
                backgroundColor: currentPlan === 'pro' && isActivePaid ? '#FAF5EB' : '#FFFDF8',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: currentPlan === 'pro' && isActivePaid ? '#4F5330' : '#E5DDCD',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Sparkles size={16} color="#4F5330" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                    Pro Enterprise
                  </Text>
                  {currentPlan === 'pro' && isActivePaid && (
                    <View
                      style={{
                        marginLeft: 8,
                        backgroundColor: '#FAF5EB',
                        borderWidth: 1,
                        borderColor: '#4F5330',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#4F5330' }}>
                        ACTIVE
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#4F5330' }}>
                  ₹1,999 / mo
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginBottom: 10 }}>
                Unlimited properties and high-volume multi-floor hostel chains
              </Text>
              <View style={{ gap: 4, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Unlimited Properties & Beds
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Priority phone & WhatsApp support
                </Text>
                <Text style={{ fontSize: 12, color: '#0C192B', fontWeight: '600' }}>
                  • Custom receipt branding & reports
                </Text>
              </View>

              {/* Pro Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleUpgrade('pro')}
                style={{
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  height: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  {currentPlan === 'pro' && isActivePaid
                    ? 'Extend Pro Plan (+30 Days)'
                    : 'Upgrade to Pro (Prorated)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Razorpay Trust Badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                marginBottom: 16,
                backgroundColor: '#FFFDF8',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5DDCD',
              }}
            >
              <ShieldCheck size={14} color="#4F5330" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#657080' }}>
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
            onClose();
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

        {/* Downgrade Confirmation Modal */}
        <ConfirmActionModal
          visible={Boolean(downgradeConfirmation)}
          onClose={() => setDowngradeConfirmation(null)}
          onConfirm={handleConfirmDowngrade}
          isLoading={isScheduling}
          variant="warning"
          icon={<Clock size={28} color="#D97706" strokeWidth={2.3} />}
          title={`Schedule Downgrade to ${downgradeConfirmation?.targetTitle}?`}
          message={`Your account will transition to ${downgradeConfirmation?.targetTitle} on ${downgradeConfirmation?.effectiveDateStr}. Full access remains active until then, and no existing data or properties will be deleted.`}
          confirmLabel="Schedule Downgrade"
          cancelLabel="Keep Current Plan"
        />
      </View>
    </Modal>
  );
};
