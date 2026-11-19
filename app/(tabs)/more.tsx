import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Zap,
  TrendingDown,
  Building,
  Users,
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
import { PropertiesRoomsModal } from '../../src/components/PropertiesRoomsModal';
import { ConfirmActionModal } from '../../src/components/ConfirmDeleteModal';
import { calculateDaysRemaining } from '../../src/utils/date';
import { getProfileAvatar } from '../../src/utils/assetImages';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscriptionApi } from '../../src/api/subscription';

export default function MoreScreen() {
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
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showSubMeterModal, setShowSubMeterModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPropertiesRoomsModal, setShowPropertiesRoomsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Dynamic total beds
  const totalBeds = React.useMemo(() => {
    return properties.reduce((sum, p) => sum + (p.stats?.totalBeds || 0), 0);
  }, [properties]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const menuSections = [
    {
      title: 'Operations',
      items: [
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
      ],
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#0C192B',
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080', marginTop: 4 }}>
            Settings & Operations
          </Text>
        </View>

        {/* Owner Profile Card */}
        <View
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#FAF5EB',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Image
              source={getProfileAvatar(user?.name || organization?.ownerName || 'Owner')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
              {user?.name || organization?.ownerName || 'PG Owner'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
              {organization?.name || 'My PG Organization'} · Owner
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSubscriptionModal(true)}
            style={{
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 9999,
              backgroundColor: isReadOnly
                ? '#FFF1F2'
                : activeStatus === 'active'
                  ? '#F3E8FF'
                  : '#FEF3C7',
              borderColor: isReadOnly
                ? '#FECDD3'
                : activeStatus === 'active'
                  ? '#E9D5FF'
                  : '#FDE68A',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isReadOnly ? '#BE123C' : activeStatus === 'active' ? '#6B21A8' : '#92400E',
              }}
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
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
                marginLeft: 4,
              }}
            >
              {section.title}
            </Text>

            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
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
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: !isLast ? 1 : 0,
                      borderBottomColor: '#F0EBE0',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: '#FAF7F2',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <IconComponent size={18} color="#4F5330" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#657080',
                            marginTop: 2,
                            fontWeight: '500',
                          }}
                        >
                          {item.detail}
                        </Text>
                      </View>
                    </View>
                    {'isSwitch' in item && item.isSwitch ? (
                      <Switch
                        value={item.switchValue}
                        onValueChange={item.onSwitchChange}
                        trackColor={{ false: '#E2E8F0', true: '#19D3E6' }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <ChevronRight size={18} color="#8E98A0" />
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
          style={{
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#FECDD3',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            marginBottom: 24,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <LogOut size={18} color="#BE123C" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#BE123C', marginLeft: 8 }}>
            Log out of Nilaaya
          </Text>
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
        properties={properties}
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

      {/* Logout Confirmation Modal */}
      <ConfirmActionModal
        visible={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          void logout();
        }}
        variant="danger"
        icon={<LogOut size={28} color="#BE123C" strokeWidth={2.3} />}
        title="Sign Out"
        message="Are you sure you want to log out of Nilaaya?"
        confirmLabel="Sign Out"
      />
    </SafeAreaView>
  );
}
