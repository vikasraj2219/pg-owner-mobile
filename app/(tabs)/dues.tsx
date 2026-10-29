import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { formatINR } from '../../src/utils/currency';
import { sendRentReminder } from '../../src/utils/whatsapp';
import { MessageCircle, CheckCircle2 } from 'lucide-react-native';

export default function DuesScreen() {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'unpaid' | 'paid'>('all');

  const invoices = [
    {
      id: 'inv-1',
      tenantName: 'Amit Shah',
      bedNumber: '102-A',
      phone: '9876543210',
      amountDuePaise: 700000,
      dueDate: '05 Nov 2026',
      status: 'overdue',
      daysOverdue: 6,
    },
    {
      id: 'inv-2',
      tenantName: 'Kunal Sharma',
      bedNumber: '201-A',
      phone: '9876543211',
      amountDuePaise: 900000,
      dueDate: '05 Nov 2026',
      status: 'unpaid',
      daysOverdue: 2,
    },
    {
      id: 'inv-3',
      tenantName: 'Rahul Verma',
      bedNumber: '101-B',
      phone: '9876543212',
      amountDuePaise: 850000,
      dueDate: '01 Nov 2026',
      status: 'paid',
      paidAt: '01 Nov 2026',
    },
  ];

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'overdue') return inv.status === 'overdue';
    if (filter === 'unpaid') return inv.status === 'unpaid' || inv.status === 'overdue';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const handleReminder = (inv: (typeof invoices)[0]) => {
    sendRentReminder(inv.phone, inv.tenantName, inv.bedNumber, inv.amountDuePaise, 'pgowner@upi');
  };

  const handleMarkPaid = (inv: (typeof invoices)[0]) => {
    Alert.alert(
      'Confirm Payment',
      `Mark ${formatINR(inv.amountDuePaise)} received via UPI/Cash from ${inv.tenantName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Share PDF',
          onPress: () => Alert.alert('Success', 'Receipt generated!'),
        },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Filter Chips */}
      <View className="flex-row gap-2 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'overdue', label: 'Overdue (>5d)' },
          { key: 'unpaid', label: 'Unpaid' },
          { key: 'paid', label: 'Paid' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            className={`px-3 py-1.5 rounded-full ${
              filter === item.key ? 'bg-primary-600' : 'bg-white border border-slate-200'
            }`}
            onPress={() => setFilter(item.key as typeof filter)}
          >
            <Text
              className={`text-xs font-semibold ${
                filter === item.key ? 'text-white' : 'text-slate-700'
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice Cards */}
      {filteredInvoices.map(inv => {
        const isPaid = inv.status === 'paid';
        return (
          <View
            key={inv.id}
            className="bg-white rounded-xl p-4 mb-3 border border-slate-200 shadow-sm"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-base font-bold text-slate-900">{inv.tenantName}</Text>
                <Text className="text-xs text-slate-500 font-medium">Bed {inv.bedNumber}</Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-extrabold text-slate-900">
                  {formatINR(inv.amountDuePaise)}
                </Text>
                <Text
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800'
                      : inv.status === 'overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isPaid
                    ? 'PAID'
                    : inv.status === 'overdue'
                      ? `${inv.daysOverdue}d OVERDUE`
                      : 'DUE'}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-slate-400 mb-3">Due: {inv.dueDate}</Text>

            {!isPaid && (
              <View className="flex-row gap-2 pt-2 border-t border-slate-100">
                <TouchableOpacity
                  className="bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 flex-1 flex-row items-center justify-center gap-1.5"
                  onPress={() => handleReminder(inv)}
                >
                  <MessageCircle size={16} color="#059669" />
                  <Text className="text-xs font-bold text-emerald-800">WhatsApp Reminder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-primary-600 rounded-lg py-2 px-3 flex-1 flex-row items-center justify-center gap-1.5"
                  onPress={() => handleMarkPaid(inv)}
                >
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">Mark Received</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
