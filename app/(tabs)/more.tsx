import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import {
  Zap,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Building,
  Users,
  LogOut,
  ChevronRight,
  Fingerprint,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';

export default function MoreScreen() {
  const { user, organization, subscription, logout, isBiometricSupported, enableBiometrics } =
    useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const getInitials = (name?: string) => {
    if (!name) return 'PG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleToggleBiometrics = async (value: boolean) => {
    setBiometricEnabled(value);
    await enableBiometrics(value);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of PG Owner?', [
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
        { icon: Zap, label: 'Sub-meter Electricity Log', detail: 'Readings & Splits' },
        { icon: TrendingDown, label: 'Expenses & Monthly P&L', detail: 'Groceries, Maintenance' },
        { icon: Building, label: 'Properties & Rooms', detail: '1 Property, 25 Beds' },
        { icon: Users, label: 'Staff & Manager Logins', detail: 'Pro Plan' },
      ],
    },
    {
      title: 'Subscription & Security',
      items: [
        {
          icon: CreditCard,
          label: 'Subscription Plan',
          detail: `${subscription?.plan ? subscription.plan.toUpperCase() : 'STARTER'} (${subscription?.status || 'Active'})`,
        },
        { icon: ShieldCheck, label: 'Privacy & KYC Compliance', detail: 'DPDP 2023 / UIDAI' },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Owner Profile Card */}
      <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex-row items-center">
        <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-3">
          <Text className="text-primary-700 font-bold text-lg">{getInitials(user?.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900">
            {user?.name || 'Property Owner'}
          </Text>
          <Text className="text-xs text-slate-500">
            {organization?.name || 'My PG Organization'} ·{' '}
            {user?.role ? user.role.toUpperCase() : 'OWNER'}
          </Text>
        </View>
        <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-emerald-800 uppercase">
            {subscription?.status || 'TRIALING'}
          </Text>
        </View>
      </View>

      {/* Biometric Security Preference Card */}
      {isBiometricSupported && (
        <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3">
              <Fingerprint size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-800">Biometric App Unlock</Text>
              <Text className="text-xs text-slate-400">
                Require Face ID / Fingerprint on launch
              </Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
          />
        </View>
      )}

      {/* Menu Sections */}
      {menuSections.map(sec => (
        <View key={sec.title} className="mb-6">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            {sec.title}
          </Text>
          <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {sec.items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.label}
                  className={`p-4 flex-row items-center justify-between ${
                    idx < sec.items.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center mr-3">
                      <Icon size={18} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800">{item.label}</Text>
                      {item.detail && <Text className="text-xs text-slate-400">{item.detail}</Text>}
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity
        className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex-row items-center justify-center gap-2 mb-10"
        onPress={handleLogout}
      >
        <LogOut size={18} color="#e11d48" />
        <Text className="text-rose-600 font-bold text-sm">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
