import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { SplashScreenView } from '../../src/components/SplashScreenView';

export default function MoreScreen() {
  const { user, organization, logout, unlockWithBiometrics } = useAuth();
  const [showSplashPreview, setShowSplashPreview] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'RK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of PG Manager?', [
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
          icon: Zap,
          label: 'Sub-meter Electricity Log',
          detail: 'Readings & automatic splits',
        },
        {
          icon: TrendingDown,
          label: 'Expenses & Monthly P&L',
          detail: 'Groceries, Maintenance, EB',
        },
        {
          icon: Building,
          label: 'Properties & Rooms',
          detail: '1 Property · 48 Beds',
        },
        {
          icon: Users,
          label: 'Staff & Manager Logins',
          detail: 'Access controls & roles',
        },
      ],
    },
    {
      title: 'App & Security',
      items: [
        {
          icon: Fingerprint,
          label: 'Biometric Lock Test',
          detail: 'Touch sensor simulation',
          onPress: () => void unlockWithBiometrics(),
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
          detail: '14-Day Free Trial (11 days left)',
        },
        {
          icon: ShieldCheck,
          label: 'DPDP & KYC Compliance',
          detail: 'Data privacy & Aadhaar store',
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
              {getInitials(user?.name || 'Ramesh Kumar')}
            </Text>
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-base font-extrabold text-slate-900">
              {user?.name || 'Ramesh Kumar'}
            </Text>
            <Text className="text-xs font-medium text-slate-500 mt-0.5">
              {organization?.name || 'Sri Sai Boys PG, Madhapur'} · Owner
            </Text>
          </View>
          <View className="bg-[#FEF9C3] border border-[#FDE047] px-2.5 py-1 rounded-full">
            <Text className="text-[10px] font-bold text-[#854D0E]">11d Trial</Text>
          </View>
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
                    <ChevronRight size={18} color="#94A3B8" />
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
          <Text className="text-sm font-bold text-[#BE123C] ml-2">Log out of PG Manager</Text>
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
    </SafeAreaView>
  );
}
