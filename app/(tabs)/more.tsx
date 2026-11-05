import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Zap,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Building,
  Users,
  UserCheck,
  LogOut,
  ChevronRight,
  Fingerprint,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useProperties } from '../../src/context/PropertyContext';
import { SplashScreenView } from '../../src/components/SplashScreenView';
import { ExpensesModal } from '../../src/components/ExpensesModal';
import { SubMeterModal } from '../../src/components/SubMeterModal';
import { StaffManagementModal } from '../../src/components/StaffManagementModal';
import { SubscriptionModal } from '../../src/components/SubscriptionModal';
import { TenantsDirectoryModal } from '../../src/components/TenantsDirectoryModal';
import { PropertiesRoomsModal } from '../../src/components/PropertiesRoomsModal';
import { DpdpKycComplianceModal } from '../../src/components/DpdpKycComplianceModal';
import { calculateDaysRemaining } from '../../src/utils/date';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscriptionApi } from '../../src/api/subscription';

export default function MoreScreen() {
  const router = useRouter();
  const {
    user,
    organization,
    subscription,
    logout,
    isBiometricEnabled,
    enableBiometrics,
    isBiometricSupported,
    isBiometricEnrolled,
  } = useAuth();
  const { properties, selectedProperty } = useProperties();
  const [showSplashPreview, setShowSplashPreview] = useState(false);
  const [showTenantsModal, setShowTenantsModal] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showSubMeterModal, setShowSubMeterModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPropertiesRoomsModal, setShowPropertiesRoomsModal] = useState(false);
  const [showDpdpKycModal, setShowDpdpKycModal] = useState(false);

  // Fresh subscription query to immediately reflect upgrades & active plan
  const { data: subQuery } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscriptionApi,
    staleTime: 15 * 1000,
  });

  const activePlan = subQuery?.plan || (subscription?.plan as string) || 'starter';
  const activeStatus = subQuery?.status || subscription?.status || 'trialing';
  const isReadOnly = subQuery?.isReadOnly || activeStatus === 'expired';

  // Dynamic remaining days (calculates exact calendar days left)
  const daysRemaining = React.useMemo(() => {
    if (subQuery?.daysLeft !== undefined) return subQuery.daysLeft;
    if (activeStatus === 'active' && subscription?.currentPeriodEnd) {
      return calculateDaysRemaining(subscription.currentPeriodEnd);
    }
    if (subscription?.trialEndsAt) {
      return calculateDaysRemaining(subscription.trialEndsAt);
    }
    return 14;
  }, [subQuery, activeStatus, subscription]);

  const planLabel = React.useMemo(() => {
    if (activePlan === 'pro') return 'Pro Enterprise';
    if (activePlan === 'growth') return 'Growth';
    return 'Starter';
  }, [activePlan]);

  // Dynamic total beds
  const totalBeds = React.useMemo(() => {
    return properties.reduce((sum, p) => sum + (p.stats?.totalBeds || 0), 0);
  }, [properties]);

  const getInitials = (name?: string) => {
    if (!name) return 'PG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Nilaaya?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  const menuSections = [
    {
      title: 'Operations',
      items: [
        {
          icon: UserCheck,
          label: 'Tenants Directory',
          detail: 'Search all tenants, room details & contacts',
          onPress: () => router.push('/(tabs)/tenants' as any),
        },
        {
          icon: Zap,
          label: 'Sub-meter Electricity Log',
          detail: 'Readings & automatic splits',
          onPress: () => setShowSubMeterModal(true),
        },
        {
          icon: TrendingDown,
          label: 'Expenses & Monthly P&L',
          detail: 'Groceries, Maintenance, EB',
          onPress: () => setShowExpensesModal(true),
        },
        {
          icon: Building,
          label: 'Properties & Rooms',
          detail: `${properties.length} Propert${properties.length === 1 ? 'y' : 'ies'} · ${totalBeds > 0 ? `${totalBeds} Beds` : 'Manage'}`,
          onPress: () => setShowPropertiesRoomsModal(true),
        },
        {
          icon: Users,
          label: 'Staff & Manager Logins',
          detail: 'Access controls & roles',
          onPress: () => setShowStaffModal(true),
        },
        {
          icon: CreditCard,
          label: 'Subscription & Quotas',
          detail: 'Plan limits, paywall status & upgrades',
          onPress: () => setShowSubscriptionModal(true),
        },
      ],
    },
    {
      title: 'App & Security',
      items: [
        {
          icon: Fingerprint,
          label: 'Biometric App Lock',
          detail: isBiometricEnabled
            ? 'Enabled (Unlock required when opening app)'
            : isBiometricSupported
              ? 'Disabled (Tap to enable Face ID / Fingerprint)'
              : 'Not supported on this device',
          isSwitch: isBiometricSupported && isBiometricEnrolled,
          switchValue: isBiometricEnabled,
          onSwitchChange: async (val: boolean) => {
            const success = await enableBiometrics(val);
            if (!success && val) {
              Alert.alert(
                'Biometrics Failed',
                'Fingerprint or facial recognition could not be verified.',
              );
            }
          },
          onPress: async () => {
            if (!isBiometricSupported) {
              Alert.alert('Not Supported', 'Biometric hardware is not available on this device.');
              return;
            }
            if (!isBiometricEnrolled) {
              Alert.alert(
                'No Biometrics Enrolled',
                'Please enroll your fingerprint or face in device Settings first.',
              );
            }
            const nextVal = !isBiometricEnabled;
            const success = await enableBiometrics(nextVal);
            if (!success && nextVal) {
              Alert.alert('Authentication Failed', 'Biometrics could not be verified.');
            }
          },
        },
        {
          icon: Sparkles,
          label: 'Brand Splash Screen',
          detail: 'View design splash screen',
          onPress: () => setShowSplashPreview(true),
        },
        {
          icon: CreditCard,
          label: 'Subscription Plan',
          detail: isReadOnly
            ? 'Trial Expired (Read-only mode)'
            : activeStatus === 'active'
              ? `${planLabel} Plan · Active (${daysRemaining}d left)`
              : `14-Day Free Trial (${daysRemaining} days left)`,
          onPress: () => setShowSubscriptionModal(true),
        },
        {
          icon: ShieldCheck,
          label: 'DPDP & KYC Compliance',
          detail: 'Data privacy & Aadhaar store',
          onPress: () => setShowDpdpKycModal(true),
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">More</Text>
          <Text className="text-sm font-medium text-slate-600 mt-1">Settings & Operations</Text>
        </View>

        {/* Owner Profile Card */}
        <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-5 shadow-xs flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-[#E8F5EE] items-center justify-center mr-3.5">
            <Text className="text-[#0A6C50] font-extrabold text-base">
              {getInitials(user?.name || organization?.ownerName || 'Owner')}
            </Text>
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-base font-extrabold text-slate-900">
              {user?.name || organization?.ownerName || 'PG Owner'}
            </Text>
            <Text className="text-xs font-medium text-slate-500 mt-0.5">
              {organization?.name || 'My PG Organization'} · Owner
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSubscriptionModal(true)}
            className={`border px-2.5 py-1 rounded-full ${
              isReadOnly
                ? 'bg-rose-50 border-rose-200'
                : activeStatus === 'active'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-[#FEF9C3] border-[#FDE047]'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isReadOnly
                  ? 'text-rose-700'
                  : activeStatus === 'active'
                    ? 'text-purple-700'
                    : 'text-[#854D0E]'
              }`}
            >
              {isReadOnly
                ? 'Expired'
                : activeStatus === 'active'
                  ? `${activePlan.toUpperCase()} · ${daysRemaining}d left`
                  : `${daysRemaining}d Trial`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        {menuSections.map(section => (
          <View key={section.title} className="mb-5">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 ml-1">
              {section.title}
            </Text>

            <View className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              {section.items.map((item, idx) => {
                const IconComponent = item.icon;
                const isLast = idx === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.7}
                    onPress={
                      item.onPress || (() => Alert.alert(item.label, `${item.label} configured.`))
                    }
                    className={`p-4 flex-row items-center justify-between ${
                      !isLast ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-9 h-9 rounded-xl bg-[#F0FDF4] items-center justify-center mr-3">
                        <IconComponent size={18} color="#0A6C50" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-900">{item.label}</Text>
                        <Text className="text-xs text-slate-500 mt-0.5 font-medium">
                          {item.detail}
                        </Text>
                      </View>
                    </View>
                    {'isSwitch' in item && item.isSwitch ? (
                      <Switch
                        value={item.switchValue}
                        onValueChange={item.onSwitchChange}
                        trackColor={{ false: '#E2E8F0', true: '#0A6C50' }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <ChevronRight size={18} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          className="bg-white border border-rose-200 rounded-2xl p-4 flex-row items-center justify-center shadow-xs mt-1"
        >
          <LogOut size={18} color="#BE123C" />
          <Text className="text-sm font-bold text-[#BE123C] ml-2">Log out of Nilaaya</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Splash preview modal */}
      <Modal
        visible={showSplashPreview}
        animationType="fade"
        onRequestClose={() => setShowSplashPreview(false)}
      >
        <SplashScreenView onDismiss={() => setShowSplashPreview(false)} />
      </Modal>

      {/* Tenants Directory Modal */}
      <TenantsDirectoryModal
        visible={showTenantsModal}
        onClose={() => setShowTenantsModal(false)}
        properties={properties}
        selectedPropertyId={selectedProperty?._id}
        onCheckoutTenant={id => router.push(`/checkout/${id}`)}
      />

      {/* Expenses & Live P&L Modal */}
      <ExpensesModal
        visible={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        propertyId={selectedProperty?._id}
      />

      {/* Sub-meter Electricity Modal */}
      <SubMeterModal
        visible={showSubMeterModal}
        onClose={() => setShowSubMeterModal(false)}
        property={selectedProperty}
      />

      {/* Staff & Manager Access Modal */}
      <StaffManagementModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        properties={properties}
      />

      {/* Subscription Paywall & Quota Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Properties & Rooms Management Modal */}
      <PropertiesRoomsModal
        visible={showPropertiesRoomsModal}
        onClose={() => setShowPropertiesRoomsModal(false)}
      />

      {/* DPDP & KYC Statutory Compliance Modal */}
      <DpdpKycComplianceModal
        visible={showDpdpKycModal}
        onClose={() => setShowDpdpKycModal(false)}
      />
    </SafeAreaView>
  );
}
