import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  X,
  Plus,
  TrendingDown,
  TrendingUp,
  IndianRupee,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import {
  createExpenseApi,
  getExpensesApi,
  getPnLSummaryApi,
  updateExpenseApi,
  deleteExpenseApi,
} from '../api/expenses';
import { IExpense, IPnLSummary, UpdateExpensePayload } from '../types/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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

const getTodayString = () => new Date().toISOString().split('T')[0];

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
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<IExpense | null>(null);
  const [editCategory, setEditCategory] = useState('maintenance');
  const [editAmountRupees, setEditAmountRupees] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPaidTo, setEditPaidTo] = useState('');
  const [editDate, setEditDate] = useState(getTodayString());
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>(
    'cash',
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<IExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetAddForm = useCallback(() => {
    setCategory('maintenance'); // Reset category so previous tag does not stay sticky
    setAmountRupees('');
    setDescription('');
    setPaidTo('');
    setDate(getTodayString()); // Always clear and reset date to today
    setPaymentMethod('cash');
  }, []);

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
      resetAddForm();
    }
  }, [visible, loadData, resetAddForm]);

  // Group recent logged expenses monthly-wise
  const monthlyGroupedExpenses = useMemo(() => {
    const groups: {
      [key: string]: {
        monthKey: string;
        monthLabel: string;
        totalPaise: number;
        items: IExpense[];
      };
    } = {};

    expenses.forEach(exp => {
      const parsed = new Date(exp.date);
      const validDate = isNaN(parsed.getTime()) ? new Date() : parsed;
      const monthKey = `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = validDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          monthLabel,
          totalPaise: 0,
          items: [],
        };
      }
      groups[monthKey].items.push(exp);
      groups[monthKey].totalPaise += exp.amountPaise;
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(k => groups[k]);
  }, [expenses]);

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
      resetAddForm();
      setActiveTab('pnl');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (exp: IExpense) => {
    setEditingExpense(exp);
    setEditCategory(exp.category);
    setEditAmountRupees((exp.amountPaise / 100).toString());
    setEditDescription(exp.description);
    setEditPaidTo(exp.paidTo || '');
    setEditDate(exp.date ? exp.date.split('T')[0] : getTodayString());
    setEditPaymentMethod(exp.paymentMethod || 'cash');
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    const num = parseFloat(editAmountRupees.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount in ₹.');
      return;
    }

    if (!editDescription.trim()) {
      Alert.alert('Missing Description', 'Please provide a brief description of the expense.');
      return;
    }

    setIsUpdating(true);
    try {
      const amountPaise = Math.round(num * 100);
      await updateExpenseApi(editingExpense._id, {
        category: editCategory as UpdateExpensePayload['category'],
        amountPaise,
        description: editDescription.trim(),
        paidTo: editPaidTo.trim() || undefined,
        date: editDate.trim() || undefined,
        paymentMethod: editPaymentMethod,
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });

      Alert.alert('Updated', 'Expense record updated successfully.');
      setEditingExpense(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update expense';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteExpense = (exp: IExpense) => {
    setDeletingExpense(exp);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await deleteExpenseApi(deletingExpense._id);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeletingExpense(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete expense';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
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
              Live cashflow tracking and monthly ledger
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
              Live P&L & Monthly Ledger
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              resetAddForm();
              setActiveTab('add');
            }}
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

            {/* Monthly-wise Expenses Grouping */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Logged Expenses Monthly-wise ({expenses.length})
            </Text>

            {monthlyGroupedExpenses.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200 mb-6">
                <Text className="text-sm font-semibold text-slate-500">
                  No expenses recorded yet.
                </Text>
                <Text className="text-xs text-slate-400 mt-1">
                  Tap 'Log New Expense' to record.
                </Text>
              </View>
            ) : (
              monthlyGroupedExpenses.map(group => (
                <View key={group.monthKey} className="mb-5">
                  {/* Month Header Banner */}
                  <View className="bg-slate-100/90 px-3.5 py-2 rounded-xl flex-row justify-between items-center mb-2.5 border border-slate-200/60">
                    <View className="flex-row items-center">
                      <Calendar size={13} color="#475569" />
                      <Text className="text-xs font-extrabold text-slate-800 ml-1.5">
                        {group.monthLabel}
                      </Text>
                      <View className="bg-slate-200/70 px-1.5 py-0.5 rounded ml-2">
                        <Text className="text-[10px] font-bold text-slate-600">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-black text-rose-700">
                      -{formatINR(group.totalPaise)}
                    </Text>
                  </View>

                  {/* Expenses in Month */}
                  {group.items.map(exp => (
                    <View
                      key={exp._id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-2.5 shadow-xs"
                    >
                      <View className="flex-row justify-between items-start mb-1">
                        <View className="flex-1 mr-3">
                          <Text className="text-sm font-extrabold text-slate-900 truncate">
                            {exp.description}
                          </Text>
                          <Text className="text-xs font-medium text-slate-500 mt-0.5 capitalize">
                            {exp.category.replace('_', ' ')} · {formatSafeDate(exp.date)}
                            {exp.paidTo ? ` · ${exp.paidTo}` : ''}
                            {exp.paymentMethod ? ` (${exp.paymentMethod.toUpperCase()})` : ''}
                          </Text>
                        </View>
                        <Text className="text-sm font-black text-rose-600">
                          -{formatINR(exp.amountPaise)}
                        </Text>
                      </View>

                      {/* Actions: Edit & Delete */}
                      <View className="flex-row justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                        <TouchableOpacity
                          onPress={() => handleOpenEdit(exp)}
                          className="flex-row items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200"
                        >
                          <Edit2 size={13} color="#0A6C50" />
                          <Text className="text-xs font-bold text-[#0A6C50] ml-1.5">Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteExpense(exp)}
                          className="flex-row items-center px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
                        >
                          <Trash2 size={13} color="#BE123C" />
                          <Text className="text-xs font-bold text-rose-700 ml-1.5">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
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

              {/* Expense Date */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Date (YYYY-MM-DD)
              </Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl px-4 py-3 mb-4 bg-white shadow-xs">
                <Calendar size={18} color="#64748B" />
                <TextInput
                  className="flex-1 ml-2 text-sm font-semibold text-slate-900"
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                />
              </View>

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

        {/* Edit Expense Modal */}
        {editingExpense && (
          <Modal
            visible={!!editingExpense}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingExpense(null)}
          >
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
              <View className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl max-h-[85%]">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-extrabold text-slate-900">
                    Edit Expense Record
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingExpense(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Category */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setEditCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg border ${
                          editCategory === cat.id
                            ? 'bg-[#E6F4EA] border-[#0A6C50]'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            editCategory === cat.id ? 'text-[#0A6C50]' : 'text-slate-600'
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Amount */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Amount (₹)
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white font-bold text-sm"
                    keyboardType="numeric"
                    value={editAmountRupees}
                    onChangeText={setEditAmountRupees}
                  />

                  {/* Description */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Description
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm"
                    value={editDescription}
                    onChangeText={setEditDescription}
                  />

                  {/* Date */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm font-semibold"
                    value={editDate}
                    onChangeText={setEditDate}
                  />

                  {/* Paid to */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Paid To
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm"
                    value={editPaidTo}
                    onChangeText={setEditPaidTo}
                  />

                  {/* Payment Mode */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                    Payment Mode
                  </Text>
                  <View className="flex-row gap-2 mb-4">
                    {(['cash', 'upi', 'bank_transfer'] as const).map(mode => (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setEditPaymentMethod(mode)}
                        className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                          editPaymentMethod === mode
                            ? 'bg-[#E6F4EA] border-[#0A6C50]'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase ${
                            editPaymentMethod === mode ? 'text-[#0A6C50]' : 'text-slate-600'
                          }`}
                        >
                          {mode === 'bank_transfer' ? 'Bank' : mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View className="flex-row gap-2 pt-2 border-t border-slate-100">
                  <TouchableOpacity
                    onPress={() => setEditingExpense(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-[#0A6C50] items-center justify-center"
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <ConfirmDeleteModal
          visible={Boolean(deletingExpense)}
          onClose={() => setDeletingExpense(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Delete Expense?"
          message={`Are you sure you want to delete "${deletingExpense?.description}" (${formatINR(deletingExpense?.amountPaise || 0)})? This will adjust your net profit calculations.`}
          confirmLabel="Delete"
        />
      </View>
    </Modal>
  );
};
