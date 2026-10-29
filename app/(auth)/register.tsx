import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    // Stage 1 implementation: POST /api/auth/register-owner
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 24, justifyContent: 'center', flexGrow: 1 }}>
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <Text className="text-2xl font-bold text-slate-900 mb-1">Start Free 14-Day Trial</Text>
          <Text className="text-sm text-slate-500 mb-6">
            No credit card required. Full access to bed matrix, rent invoices, and WhatsApp
            reminders.
          </Text>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Your Name</Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="e.g. Ramesh Kumar"
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">
              PG / Hostel Name
            </Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="e.g. Sri Sai Coliving"
              value={orgName}
              onChangeText={setOrgName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">
              Mobile Number
            </Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">
              Email Address
            </Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="owner@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Password</Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="Minimum 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className="bg-primary-600 rounded-lg py-3 items-center mb-4"
            onPress={handleRegister}
          >
            <Text className="text-white font-semibold text-base">Create Owner Account</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={() => router.push('/(auth)/login')}>
            <Text className="text-sm text-slate-500">
              Already have an account?{' '}
              <Text className="text-primary-600 font-semibold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
