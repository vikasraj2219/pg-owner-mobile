import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import axios from 'axios';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [ownerName, setOwnerName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!ownerName.trim() || !orgName.trim() || !phone.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all fields to start your trial.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        ownerName: ownerName.trim(),
        orgName: orgName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // NavigationGuard navigates to (tabs) upon successful registration
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message || 'Registration failed. Please review the details entered.';
        setErrorMessage(msg);
      } else {
        Alert.alert('Registration Error', 'Unable to reach backend server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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

          {errorMessage && (
            <View className="bg-rose-50 border border-rose-200 p-3 rounded-lg mb-4">
              <Text className="text-xs text-rose-700 font-medium">{errorMessage}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Your Name</Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="e.g. Ramesh Kumar"
              value={ownerName}
              onChangeText={text => {
                setOwnerName(text);
                if (errorMessage) setErrorMessage(null);
              }}
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
              onChangeText={text => {
                setOrgName(text);
                if (errorMessage) setErrorMessage(null);
              }}
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
              onChangeText={text => {
                setPhone(text);
                if (errorMessage) setErrorMessage(null);
              }}
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
              autoCorrect={false}
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-700 uppercase mb-1">Password</Text>
            <TextInput
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 bg-white"
              placeholder="Minimum 6 characters"
              secureTextEntry
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          <TouchableOpacity
            className={`bg-primary-600 rounded-lg py-3.5 items-center mb-4 ${
              isSubmitting ? 'opacity-70' : ''
            }`}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Owner Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push('/(auth)/login')}
            disabled={isSubmitting}
          >
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
