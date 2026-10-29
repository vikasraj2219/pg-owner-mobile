import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { sendRentReminder } from '../../src/utils/whatsapp';

interface DueInvoice {
  id: string;
  initials: string;
  name: string;
  bed: string;
  dueDate: string;
  amount: string;
  amountNumber: number;
  overdueText: string;
  phone: string;
  status: 'overdue' | 'unpaid' | 'paid';
}

export default function DuesScreen() {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'unpaid' | 'paid'>('overdue');

  const [invoices, setInvoices] = useState<DueInvoice[]>([
    {
      id: '1',
      initials: 'RV',
      name: 'Rahul Verma',
      bed: 'Bed 201-A',
      dueDate: 'Due 5 Oct',
      amount: '₹8,500',
      amountNumber: 850000,
      overdueText: '24 days overdue',
      phone: '9876543210',
      status: 'overdue',
    },
    {
      id: '2',
      initials: 'SK',
      name: 'Suresh Kumar',
      bed: 'Bed 101-B',
      dueDate: 'Due 10 Oct',
      amount: '₹7,500',
      amountNumber: 750000,
      overdueText: '19 days overdue',
      phone: '9876543211',
      status: 'overdue',
    },
    {
      id: '3',
      initials: 'AR',
      name: 'Anil Reddy',
      bed: 'Bed 305-C',
      dueDate: 'Due 15 Oct',
      amount: '₹12,000',
      amountNumber: 1200000,
      overdueText: '14 days overdue',
      phone: '9876543212',
      status: 'overdue',
    },
    {
      id: '4',
      initials: 'VS',
      name: 'Vikram Singh',
      bed: 'Bed 102-B',
      dueDate: 'Due 25 Oct',
      amount: '₹9,000',
      amountNumber: 900000,
      overdueText: '4 days overdue',
      phone: '9876543213',
      status: 'unpaid',
    },
    {
      id: '5',
      initials: 'KS',
      name: 'Karan Sharma',
      bed: 'Bed 202-A',
      dueDate: 'Due 28 Oct',
      amount: '₹8,000',
      amountNumber: 800000,
      overdueText: '1 day overdue',
      phone: '9876543214',
      status: 'unpaid',
    },
    {
      id: '6',
      initials: 'DM',
      name: 'Deepak Mishra',
      bed: 'Bed 301-A',
      dueDate: 'Due 30 Oct',
      amount: '₹8,000',
      amountNumber: 800000,
      overdueText: 'Due today',
      phone: '9876543215',
      status: 'unpaid',
    },
  ]);

  const filteredList = invoices.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return item.status === 'overdue';
    if (filter === 'unpaid') return item.status === 'unpaid' || item.status === 'overdue';
    if (filter === 'paid') return item.status === 'paid';
    return true;
  });

  const handleSendWhatsApp = (item: DueInvoice) => {
    sendRentReminder(item.phone, item.name, item.bed, item.amountNumber, 'srisaipg@okaxis');
  };

  const handleMarkReceived = (item: DueInvoice) => {
    Alert.alert(
      'Mark Rent as Received',
      `Confirm receipt of ${item.amount} from ${item.name} (${item.bed})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Received',
          onPress: () => {
            setInvoices(prev =>
              prev.map(inv =>
                inv.id === item.id ? { ...inv, status: 'paid', overdueText: 'Paid' } : inv,
              ),
            );
            Alert.alert('Payment Recorded', `Receipt generated for ${item.name}.`);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title & Month */}
        <View className="mb-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">Dues</Text>
          <Text className="text-sm font-medium text-slate-600 mt-1">October 2026</Text>
        </View>

        {/* Total Outstanding Card */}
        <View className="bg-white border border-slate-200/80 rounded-2xl p-4 flex-row items-center justify-between mb-4 shadow-xs">
          <Text className="text-sm font-semibold text-slate-700">
            Total outstanding · 6 tenants
          </Text>
          <Text className="text-2xl font-extrabold text-[#BE123C]">₹48,000</Text>
        </View>

        {/* Filter Pills */}
        <View className="flex-row items-center gap-2 mb-4 flex-wrap">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('all')}
            className={`px-4 py-2 rounded-full ${
              filter === 'all' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${filter === 'all' ? 'text-white' : 'text-slate-800'}`}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-full ${
              filter === 'overdue' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                filter === 'overdue' ? 'text-white' : 'text-slate-800'
              }`}
            >
              Overdue (&gt;5 days)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('unpaid')}
            className={`px-4 py-2 rounded-full ${
              filter === 'unpaid' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                filter === 'unpaid' ? 'text-white' : 'text-slate-800'
              }`}
            >
              Unpaid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFilter('paid')}
            className={`px-4 py-2 rounded-full ${
              filter === 'paid' ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-bold ${filter === 'paid' ? 'text-white' : 'text-slate-800'}`}
            >
              Paid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Invoices List */}
        {filteredList.map(item => (
          <View
            key={item.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-3 shadow-xs"
          >
            {/* Top row with Avatar, Name, Bed, Amount */}
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-full bg-[#E2E8F0] items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-slate-700">{item.initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5">
                    {item.bed} · {item.dueDate}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-lg font-extrabold text-slate-900">{item.amount}</Text>
                <Text
                  className={`text-xs font-bold mt-0.5 ${
                    item.status === 'paid' ? 'text-[#0A6C50]' : 'text-[#BE123C]'
                  }`}
                >
                  {item.overdueText}
                </Text>
              </View>
            </View>

            {/* Actions: WhatsApp + Mark received */}
            {item.status !== 'paid' && (
              <View className="flex-row items-center gap-2.5 mt-3.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSendWhatsApp(item)}
                  className="w-12 h-11 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl items-center justify-center"
                >
                  <MessageCircle size={20} color="#0A6C50" strokeWidth={2.2} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleMarkReceived(item)}
                  className="flex-1 h-11 bg-[#0A6C50] rounded-xl items-center justify-center shadow-xs"
                >
                  <Text className="text-white font-bold text-sm">Mark received</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
