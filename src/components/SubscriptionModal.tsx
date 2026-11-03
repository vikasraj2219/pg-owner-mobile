import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Sparkles, AlertCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentSubscriptionApi, upgradeSubscriptionApi } from '../api/subscription';
import { ISubscriptionCurrent } from '../types/api';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ visible, onClose }) => {
  const queryClient = useQueryClient();
  const [sub, setSub] = useState<ISubscriptionCurrent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const loadSub = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentSubscriptionApi();
      setSub(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSub();
    }
  }, [visible, loadSub]);

  const handleUpgrade = async (plan: 'growth' | 'pro') => {
    setIsUpgrading(true);
    try {
      await upgradeSubscriptionApi(plan);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Upgrade Successful!',
        `Your subscription is now active on the ${plan.toUpperCase()} tier for 30 days. All mutating operations are unlocked!`,
      );
      loadSub();
    } catch {
      Alert.alert('Upgrade Error', 'Failed to update plan. Please contact support.');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!visible) return null;

  const isExpired = sub?.isReadOnly || sub?.status === 'expired';

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
              Plan quotas and paywall status
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
                    and tenants. Upgrade below to resume check-ins, adding rooms, and recording
                    payments.
                  </Text>
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
                        ? 'Active'
                        : `${sub?.daysLeft || 0}d Trial`}
                  </Text>
                </View>
              </View>

              {/* Resource meters */}
              <View className="pt-3 border-t border-slate-100">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700">Properties Registered</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {sub?.propertiesUsed || 0} / {sub?.maxProperties || 1} allowed
                  </Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <View
                    className="h-full bg-[#0A6C50] rounded-full"
                    style={{
                      width: `${Math.min(100, ((sub?.propertiesUsed || 0) / (sub?.maxProperties || 1)) * 100)}%`,
                    }}
                  />
                </View>

                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700">Total Bed Capacity</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {sub?.bedsUsed || 0} / {sub?.maxBeds || 30} allowed
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

            {/* Upgrade Options */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Upgrade Plans
            </Text>

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
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isUpgrading}
                onPress={() => handleUpgrade('growth')}
                className="bg-[#0A6C50] rounded-xl py-3 items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">
                  {sub?.plan === 'growth' ? 'Renew Growth Plan' : 'Upgrade to Growth'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pro Tier */}
            <View className="bg-white rounded-2xl p-5 border border-purple-200 mb-6 shadow-xs">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center">
                  <Sparkles size={16} color="#7E22CE" />
                  <Text className="text-lg font-black text-slate-900 ml-1.5">Pro Enterprise</Text>
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
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isUpgrading}
                onPress={() => handleUpgrade('pro')}
                className="bg-purple-700 rounded-xl py-3 items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">
                  {sub?.plan === 'pro' ? 'Renew Pro Plan' : 'Upgrade to Pro'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};
