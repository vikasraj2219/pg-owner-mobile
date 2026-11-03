import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Plus, TrendingDown, TrendingUp, IndianRupee } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { createExpenseApi, getExpensesApi, getPnLSummaryApi } from '../api/expenses';
import { IExpense, IPnLSummary } from '../types/api';

interface ExpensesModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId?: string;
}

const CATEGORIES = [
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'electricity', label: 'EB / Power' },
  { id: 'water', label: 'Water Tanker' },
  { id: 'wifi', label: 'Internet / Wifi' },
  { id: 'groceries_food', label: 'Groceries / Mess' },
  { id: 'staff_salary', label: 'Staff Salary' },
  { id: 'cleaning', label: 'Cleaning / Waste' },
  { id: 'rent_lease', label: 'Property Rent / Lease' },
  { id: 'other', label: 'Other Expense' },
];

export const ExpensesModal: React.FC<ExpensesModalProps> = ({ visible, onClose, propertyId }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pnl' | 'add'>('pnl');

  // P&L and expenses list state
  const [isLoading, setIsLoading] = useState(false);
  const [pnl, setPnl] = useState<IPnLSummary | null>(null);
  const [expenses, setExpenses] = useState<IExpense[]>([]);

  // Form state
  const [category, setCategory] = useState('maintenance');
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pnlData, expensesData] = await Promise.all([
        getPnLSummaryApi({ propertyId }),
        getExpensesApi({ propertyId }),
      ]);
      setPnl(pnlData);
      setExpenses(expensesData.expenses);
    } catch {
      // silently handle in case of network issue
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleSaveExpense = async () => {
    const num = parseFloat(amountRupees.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount in ₹.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide a brief description of the expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const amountPaise = Math.round(num * 100);
      await createExpenseApi({
        propertyId,
        category,
        amountPaise,
        description: description.trim(),
        paidTo: paidTo.trim() || undefined,
        paymentMethod,
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });

      Alert.alert('Expense Recorded', `Logged ${formatINR(amountPaise)} under ${category}.`);
      setAmountRupees('');
      setDescription('');
      setPaidTo('');
      setActiveTab('pnl');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

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
            <Text className="text-xl font-extrabold text-slate-900">Expenses & Monthly P&L</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-0.5">
              Live cashflow tracking and ledger
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View className="px-5 py-3 bg-white border-b border-slate-200/60 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setActiveTab('pnl')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
              activeTab === 'pnl' ? 'bg-[#E6F4EA] border-[#0A6C50]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'pnl' ? 'text-[#0A6C50]' : 'text-slate-600'
              }`}
            >
              Live P&L & History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('add')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
              activeTab === 'add' ? 'bg-[#E6F4EA] border-[#0A6C50]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View className="flex-row items-center">
              <Plus size={14} color={activeTab === 'add' ? '#0A6C50' : '#475569'} />
              <Text
                className={`text-xs font-bold ml-1 ${
                  activeTab === 'add' ? 'text-[#0A6C50]' : 'text-slate-600'
                }`}
              >
                Log New Expense
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 text-sm font-medium mt-3">Loading P&L ledger…</Text>
          </View>
        ) : activeTab === 'pnl' ? (
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* Net Cashflow Hero Card */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-4 shadow-xs">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Net Operating Cashflow (This Month)
              </Text>
              <Text
                className={`text-3xl font-black mb-4 ${
                  (pnl?.netCashflowPaise || 0) >= 0 ? 'text-[#0A6C50]' : 'text-rose-600'
                }`}
              >
                {formatINR(pnl?.netCashflowPaise || 0)}
              </Text>

              <View className="flex-row gap-3 pt-3 border-t border-slate-100">
                <View className="flex-1 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <View className="flex-row items-center mb-1">
                    <TrendingUp size={14} color="#0A6C50" />
                    <Text className="text-[11px] font-bold text-emerald-800 ml-1">Collections</Text>
                  </View>
                  <Text className="text-base font-extrabold text-emerald-900">
                    {formatINR(pnl?.collectionsPaise || 0)}
                  </Text>
                </View>

                <View className="flex-1 bg-rose-50 rounded-xl p-3 border border-rose-100">
                  <View className="flex-row items-center mb-1">
                    <TrendingDown size={14} color="#BE123C" />
                    <Text className="text-[11px] font-bold text-rose-800 ml-1">Expenses</Text>
                  </View>
                  <Text className="text-base font-extrabold text-rose-900">
                    {formatINR(pnl?.expensesPaise || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Category Breakdown */}
            {pnl && pnl.categoryBreakdown.length > 0 && (
              <View className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
                <Text className="text-xs font-bold text-slate-600 uppercase mb-3">
                  Expense Category Breakdown
                </Text>
                {pnl.categoryBreakdown.map(item => (
                  <View key={item.category} className="mb-2.5">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs font-bold text-slate-800 capitalize">
                        {item.category.replace('_', ' ')}
                      </Text>
                      <Text className="text-xs font-bold text-slate-700">
                        {formatINR(item.amountPaise)} ({item.percentage}%)
                      </Text>
                    </View>
                    <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Expenses List */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Recent Logged Expenses ({expenses.length})
            </Text>
            {expenses.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200 mb-6">
                <Text className="text-sm font-semibold text-slate-500">
                  No expenses recorded yet.
                </Text>
                <Text className="text-xs text-slate-400 mt-1">
                  Tap 'Log New Expense' to record.
                </Text>
              </View>
            ) : (
              expenses.map(exp => (
                <View
                  key={exp._id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-2.5 flex-row justify-between items-center"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-bold text-slate-900 truncate">
                      {exp.description}
                    </Text>
                    <Text className="text-xs font-medium text-slate-500 mt-0.5 capitalize">
                      {exp.category.replace('_', ' ')} · {formatSafeDate(exp.date)}
                      {exp.paidTo ? ` · ${exp.paidTo}` : ''}
                    </Text>
                  </View>
                  <Text className="text-sm font-extrabold text-rose-600">
                    -{formatINR(exp.amountPaise)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          /* Add Expense Form */
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-6 shadow-xs">
              {/* Category Picker */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-2">Category</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl border ${
                      category === cat.id
                        ? 'bg-[#E6F4EA] border-[#0A6C50]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        category === cat.id ? 'text-[#0A6C50]' : 'text-slate-600'
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">Amount (₹)</Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl px-4 py-3 mb-4 bg-white shadow-xs">
                <IndianRupee size={18} color="#64748B" />
                <TextInput
                  className="flex-1 ml-2 text-base font-bold text-slate-900"
                  placeholder="e.g. 2500"
                  keyboardType="numeric"
                  value={amountRupees}
                  onChangeText={setAmountRupees}
                />
              </View>

              {/* Description */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Description / Purpose
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. Repair of water pump on terrace"
                value={description}
                onChangeText={setDescription}
              />

              {/* Paid to Vendor / Person */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Paid To (Optional)
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. Suresh Plumber"
                value={paidTo}
                onChangeText={setPaidTo}
              />

              {/* Payment Mode */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-2">Payment Mode</Text>
              <View className="flex-row gap-2 mb-6">
                {(['cash', 'upi', 'bank_transfer'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setPaymentMethod(mode)}
                    className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                      paymentMethod === mode
                        ? 'bg-[#E6F4EA] border-[#0A6C50]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${
                        paymentMethod === mode ? 'text-[#0A6C50]' : 'text-slate-600'
                      }`}
                    >
                      {mode === 'bank_transfer' ? 'Bank' : mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save CTA */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={handleSaveExpense}
                className="bg-[#0A6C50] rounded-xl py-4 items-center justify-center shadow-xs"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">Record Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};
