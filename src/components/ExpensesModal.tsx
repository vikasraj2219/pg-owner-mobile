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
  Platform,
  Image,
} from 'react-native';
import {
  X,
  Plus,
  TrendingDown,
  TrendingUp,
  IndianRupee,
  Trash2,
  Calendar,
  Building2,
  PieChart,
  Coins,
  BarChart3,
  MinusCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Filter,
  Wallet,
  Receipt,
  Users,
  Zap,
  Wrench,
  Wifi,
  Utensils,
  Tag,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { getPropertyImage } from '../utils/assetImages';
import {
  createExpenseApi,
  getExpensesApi,
  getPnLSummaryApi,
  updateExpenseApi,
  deleteExpenseApi,
} from '../api/expenses';
import { IExpense, IPnLSummary, UpdateExpensePayload } from '../types/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useProperties } from '../context/PropertyContext';

interface ExpensesModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId?: string;
}

const CATEGORIES = [
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'electricity', label: 'EB / Power', icon: Zap },
  { id: 'water', label: 'Water Tanker', icon: Tag },
  { id: 'wifi', label: 'Internet / Wifi', icon: Wifi },
  { id: 'groceries_food', label: 'Groceries / Mess', icon: Utensils },
  { id: 'staff_salary', label: 'Staff Salary', icon: Users },
  { id: 'cleaning', label: 'Cleaning / Waste', icon: Tag },
  { id: 'rent_lease', label: 'Property Rent / Lease', icon: Building2 },
  { id: 'other', label: 'Other Expense', icon: Tag },
];

const getTodayString = () => new Date().toISOString().split('T')[0];

const getCurrentMonthLabel = () => {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const ExpensesModal: React.FC<ExpensesModalProps> = ({ visible, onClose, propertyId }) => {
  const queryClient = useQueryClient();
  const { properties } = useProperties();
  const [activeTab, setActiveTab] = useState<'pnl' | 'add'>('pnl');

  // Property filtering state: null = All properties (consolidated)
  const [selectedFilterPropertyId, setSelectedFilterPropertyId] = useState<string | null>(
    propertyId || null,
  );

  // P&L and expenses list state
  const [isLoading, setIsLoading] = useState(false);
  const [pnl, setPnl] = useState<IPnLSummary | null>(null);
  const [expenses, setExpenses] = useState<IExpense[]>([]);

  // Form state for adding an expense
  const [formPropertyId, setFormPropertyId] = useState<string | null>(
    propertyId || (properties.length === 1 ? properties[0]._id : null),
  );
  const [category, setCategory] = useState('maintenance');
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<IExpense | null>(null);
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);
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

  // Sync initial propertyId when opening modal
  useEffect(() => {
    if (visible) {
      const initialId = propertyId || null;
      setSelectedFilterPropertyId(initialId);
      setFormPropertyId(initialId || (properties.length === 1 ? properties[0]._id : null));
    }
  }, [visible, propertyId, properties]);

  const resetAddForm = useCallback(() => {
    setCategory('maintenance');
    setAmountRupees('');
    setDescription('');
    setPaidTo('');
    setDate(getTodayString());
    setPaymentMethod('cash');
    setFormPropertyId(
      selectedFilterPropertyId || (properties.length === 1 ? properties[0]._id : null),
    );
  }, [selectedFilterPropertyId, properties]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pnlData, expensesData] = await Promise.all([
        getPnLSummaryApi({ propertyId: selectedFilterPropertyId || undefined }),
        getExpensesApi({ propertyId: selectedFilterPropertyId || undefined }),
      ]);
      setPnl(pnlData);
      setExpenses(expensesData.expenses);
    } catch {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilterPropertyId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Active property object for unit economics
  const activeProperty = useMemo(() => {
    if (!selectedFilterPropertyId) return null;
    return properties.find(p => p._id === selectedFilterPropertyId) || null;
  }, [selectedFilterPropertyId, properties]);

  // Unit economics computations
  const unitEconomics = useMemo(() => {
    if (activeProperty) {
      const totalBeds = activeProperty.stats?.totalBeds || 0;
      const occupiedBeds = activeProperty.stats?.occupiedBeds || 0;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const costPerOccupiedBed =
        occupiedBeds > 0 ? Math.round((pnl?.expensesPaise || 0) / occupiedBeds) : 0;
      const collectionsPerBed =
        occupiedBeds > 0 ? Math.round((pnl?.collectionsPaise || 0) / occupiedBeds) : 0;
      const netPerBed =
        occupiedBeds > 0 ? Math.round((pnl?.netCashflowPaise || 0) / occupiedBeds) : 0;

      return {
        isSpecificProperty: true,
        propertyName: activeProperty.name,
        totalBeds,
        occupiedBeds,
        occupancyRate,
        costPerOccupiedBed,
        collectionsPerBed,
        netPerBed,
      };
    } else {
      const totalBeds = properties.reduce((sum, p) => sum + (p.stats?.totalBeds || 0), 0);
      const occupiedBeds = properties.reduce((sum, p) => sum + (p.stats?.occupiedBeds || 0), 0);
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const costPerOccupiedBed =
        occupiedBeds > 0 ? Math.round((pnl?.expensesPaise || 0) / occupiedBeds) : 0;
      const collectionsPerBed =
        occupiedBeds > 0 ? Math.round((pnl?.collectionsPaise || 0) / occupiedBeds) : 0;
      const netPerBed =
        occupiedBeds > 0 ? Math.round((pnl?.netCashflowPaise || 0) / occupiedBeds) : 0;

      return {
        isSpecificProperty: false,
        propertyName: 'All Properties',
        totalBeds,
        occupiedBeds,
        occupancyRate,
        costPerOccupiedBed,
        collectionsPerBed,
        netPerBed,
      };
    }
  }, [activeProperty, properties, pnl]);

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
        propertyId: formPropertyId || undefined,
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
    const existingPropId =
      typeof exp.property === 'object' && exp.property ? exp.property._id : null;
    setEditPropertyId(existingPropId);
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
        propertyId: editPropertyId || undefined,
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
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* Header matching design */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (activeTab === 'add') {
                setActiveTab('pnl');
              } else {
                onClose();
              }
            }}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0C192B',
                letterSpacing: -0.3,
              }}
            >
              Expenses & Monthly P&L
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#657080',
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              Track your expenses and financial summary
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 26 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Tabs (Live P&L vs Log New Expense) */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('pnl')}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 9999,
                backgroundColor: activeTab === 'pnl' ? '#19D3E6' : '#FFFDF8',
                borderWidth: 1,
                borderColor: activeTab === 'pnl' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <TrendingUp size={15} color="#0C192B" strokeWidth={2.3} style={{ marginRight: 6 }} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                Live P&L & Monthly Ledger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                resetAddForm();
                setActiveTab('add');
              }}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 9999,
                backgroundColor: activeTab === 'add' ? '#19D3E6' : '#FFFDF8',
                borderWidth: 1,
                borderColor: activeTab === 'add' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Plus size={15} color="#0C192B" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                Log New Expense
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'pnl' ? (
            <>
              {/* Filter By Property */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Filter size={14} color="#0C192B" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                    Filter by Property
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedFilterPropertyId(null)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 9999,
                      backgroundColor: selectedFilterPropertyId === null ? '#19D3E6' : '#FFFDF8',
                      borderWidth: 1,
                      borderColor: selectedFilterPropertyId === null ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Building2
                      size={13}
                      color={selectedFilterPropertyId === null ? '#0C192B' : '#657080'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: selectedFilterPropertyId === null ? '800' : '600',
                        color: selectedFilterPropertyId === null ? '#0C192B' : '#657080',
                      }}
                    >
                      All Properties (Consolidated)
                    </Text>
                  </TouchableOpacity>

                  {properties.map((p, idx) => {
                    const isSelected = selectedFilterPropertyId === p._id;
                    return (
                      <TouchableOpacity
                        key={p._id}
                        onPress={() => setSelectedFilterPropertyId(p._id)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 9999,
                          backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                          borderWidth: 1,
                          borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                        }}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 6,
                            overflow: 'hidden',
                            marginRight: 6,
                          }}
                        >
                          <Image
                            source={getPropertyImage(p, idx)}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isSelected ? '800' : '600',
                            color: '#0C192B',
                          }}
                        >
                          {p.name}
                        </Text>
                        {isSelected && (
                          <ChevronDown size={14} color="#0C192B" style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Select Month Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FAF5EB',
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={16} color="#0C192B" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                    Select Month
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: '#0C192B', marginRight: 4 }}
                  >
                    {getCurrentMonthLabel()}
                  </Text>
                  <ChevronDown size={14} color="#0C192B" />
                </View>
              </View>

              {isLoading ? (
                <View
                  style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}
                >
                  <ActivityIndicator size="large" color="#4F5330" />
                  <Text
                    style={{ color: '#657080', fontSize: 13, fontWeight: '600', marginTop: 12 }}
                  >
                    Loading P&L ledger…
                  </Text>
                </View>
              ) : (
                <>
                  {/* Hero Cards: Collections & Expenses side-by-side */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* Collections Card */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#EAF7EE',
                        borderWidth: 1,
                        borderColor: '#B2E7C3',
                        borderRadius: 20,
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: '#DCFCE7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 6,
                          }}
                        >
                          <TrendingUp size={13} color="#15803D" strokeWidth={2.5} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                          Collections
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 21,
                          fontWeight: '800',
                          color: '#0C192B',
                          marginBottom: 8,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatINR(pnl?.collectionsPaise || 0)}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 9999,
                            backgroundColor: '#DCFCE7',
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>
                            ↑ 6% vs last month
                          </Text>
                        </View>
                        <Wallet size={20} color="#15803D" strokeWidth={2} />
                      </View>
                    </View>

                    {/* Expenses Card */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#FDF1F1',
                        borderWidth: 1,
                        borderColor: '#F9CACA',
                        borderRadius: 20,
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: '#FEE2E2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 6,
                          }}
                        >
                          <TrendingDown size={13} color="#BE123C" strokeWidth={2.5} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                          Expenses
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 21,
                          fontWeight: '800',
                          color: '#0C192B',
                          marginBottom: 8,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatINR(pnl?.expensesPaise || 0)}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 9999,
                            backgroundColor: '#FEE2E2',
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#BE123C' }}>
                            ↑ 8% vs last month
                          </Text>
                        </View>
                        <Receipt size={20} color="#BE123C" strokeWidth={2} />
                      </View>
                    </View>
                  </View>

                  {/* Unit Economics Card */}
                  <View
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      padding: 16,
                      marginBottom: 16,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 14,
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
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          <Image
                            source={getPropertyImage(unitEconomics.propertyName)}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                            Unit Economics ({unitEconomics.propertyName})
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '500',
                              color: '#657080',
                              marginTop: 1,
                            }}
                          >
                            Per-bed operating cost & yield
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 9999,
                          backgroundColor: '#DCFCE7',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                          {unitEconomics.occupiedBeds}/{unitEconomics.totalBeds} Beds (
                          {unitEconomics.occupancyRate}%)
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#FAF5EB',
                      }}
                    >
                      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
                        <Coins size={15} color="#4F5330" style={{ marginBottom: 4 }} />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Cost / Bed
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: '#0C192B',
                            marginTop: 2,
                          }}
                        >
                          {formatINR(unitEconomics.costPerOccupiedBed)}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                          Monthly expense
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 1,
                          backgroundColor: '#E5DDCD',
                          marginVertical: 4,
                        }}
                      />

                      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
                        <BarChart3 size={15} color="#4F5330" style={{ marginBottom: 4 }} />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Yield / Bed
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: '#0C192B',
                            marginTop: 2,
                          }}
                        >
                          {formatINR(unitEconomics.collectionsPerBed)}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                          Revenue collected
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 1,
                          backgroundColor: '#E5DDCD',
                          marginVertical: 4,
                        }}
                      />

                      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
                        <MinusCircle
                          size={15}
                          color={unitEconomics.netPerBed >= 0 ? '#15803D' : '#BE123C'}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#657080',
                            textTransform: 'uppercase',
                          }}
                        >
                          Net / Bed
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: unitEconomics.netPerBed >= 0 ? '#15803D' : '#BE123C',
                            marginTop: 2,
                          }}
                        >
                          {unitEconomics.netPerBed >= 0
                            ? formatINR(unitEconomics.netPerBed)
                            : `-${formatINR(Math.abs(unitEconomics.netPerBed))}`}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                          Net profit
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Expense Category Breakdown */}
                  {pnl && pnl.categoryBreakdown && pnl.categoryBreakdown.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <PieChart size={16} color="#4F5330" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                            Expense Category Breakdown
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: '#FFFDF8',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: '#0C192B',
                              marginRight: 3,
                            }}
                          >
                            This Month
                          </Text>
                          <ChevronDown size={13} color="#0C192B" />
                        </View>
                      </View>

                      <View
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          padding: 16,
                          gap: 14,
                        }}
                      >
                        {pnl.categoryBreakdown.map(item => {
                          const matched = CATEGORIES.find(c => c.id === item.category);
                          const IconComp = matched?.icon || Tag;
                          const categoryTitle = matched?.label || item.category.replace('_', ' ');

                          return (
                            <View key={item.category}>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: 6,
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <IconComp size={15} color="#4F5330" style={{ marginRight: 8 }} />
                                  <Text
                                    style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}
                                  >
                                    {categoryTitle}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                                  {formatINR(item.amountPaise)} ({item.percentage}%)
                                </Text>
                              </View>
                              <View
                                style={{
                                  height: 6,
                                  backgroundColor: '#FAF5EB',
                                  borderRadius: 9999,
                                  overflow: 'hidden',
                                }}
                              >
                                <View
                                  style={{
                                    height: '100%',
                                    backgroundColor: '#4F5330',
                                    borderRadius: 9999,
                                    width: `${Math.min(100, Math.max(4, item.percentage))}%`,
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Recent Expenses List */}
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={16} color="#0C192B" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                          Recent Expenses
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          // Scroll or trigger full list view
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0799AA' }}>
                          View All ({expenses.length}) →
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {expenses.length === 0 ? (
                      <View
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderRadius: 20,
                          padding: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
                          No expenses recorded yet.
                        </Text>
                        <TouchableOpacity
                          onPress={() => setActiveTab('add')}
                          style={{ marginTop: 8 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330' }}>
                            + Log your first expense
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      expenses.map(exp => (
                        <TouchableOpacity
                          key={exp._id}
                          onPress={() => handleOpenEdit(exp)}
                          activeOpacity={0.7}
                          style={{
                            backgroundColor: '#FFFDF8',
                            borderRadius: 18,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            marginBottom: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.03,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flex: 1,
                              marginRight: 10,
                            }}
                          >
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: '#D1F4F9',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                              }}
                            >
                              <Calendar size={18} color="#0799AA" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '800',
                                  color: '#0C192B',
                                }}
                                numberOfLines={1}
                              >
                                {exp.description}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '500',
                                  color: '#657080',
                                  marginTop: 2,
                                  textTransform: 'capitalize',
                                }}
                              >
                                {formatSafeDate(exp.date)} • {exp.paymentMethod || 'Cash'}
                                {exp.property?.name ? ` • ${exp.property.name}` : ''}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '800',
                                color: '#BE123C',
                                marginRight: 6,
                              }}
                            >
                              -{formatINR(exp.amountPaise)}
                            </Text>
                            <ChevronRight size={16} color="#657080" />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </>
              )}
            </>
          ) : (
            /* Log New Expense Form Tab */
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                padding: 18,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B', marginBottom: 14 }}>
                Record New Expense
              </Text>

              {/* Property Scope Picker */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Property / Scope
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => setFormPropertyId(null)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 9999,
                    backgroundColor: formPropertyId === null ? '#19D3E6' : '#FAF5EB',
                    borderWidth: 1,
                    borderColor: formPropertyId === null ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Building2
                    size={12}
                    color={formPropertyId === null ? '#0C192B' : '#657080'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: formPropertyId === null ? '800' : '600',
                      color: formPropertyId === null ? '#0C192B' : '#657080',
                    }}
                  >
                    General Overhead (All Properties)
                  </Text>
                </TouchableOpacity>

                {properties.map((p, idx) => {
                  const isSelected = formPropertyId === p._id;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => setFormPropertyId(p._id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 9999,
                        backgroundColor: isSelected ? '#19D3E6' : '#FAF5EB',
                        borderWidth: 1,
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          overflow: 'hidden',
                          marginRight: 6,
                        }}
                      >
                        <Image
                          source={getPropertyImage(p, idx)}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                        }}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category Picker */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Category
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {CATEGORIES.map(cat => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 9999,
                        backgroundColor: isSelected ? '#19D3E6' : '#FAF5EB',
                        borderWidth: 1,
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Amount (₹) *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: '#FAF5EB',
                  marginBottom: 14,
                }}
              >
                <IndianRupee size={16} color="#657080" />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#0C192B',
                  }}
                  placeholder="e.g. 2500"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amountRupees}
                  onChangeText={setAmountRupees}
                />
              </View>

              {/* Description */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Description / Purpose *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0C192B',
                  marginBottom: 14,
                }}
                placeholder="e.g. Repair of water pump on terrace"
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
              />

              {/* Expense Date */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Date (YYYY-MM-DD)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: '#FAF5EB',
                  marginBottom: 14,
                }}
              >
                <Calendar size={16} color="#657080" />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#0C192B',
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              {/* Paid to Vendor / Person */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Paid To (Optional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0C192B',
                  marginBottom: 14,
                }}
                placeholder="e.g. Suresh Plumber"
                placeholderTextColor="#94A3B8"
                value={paidTo}
                onChangeText={setPaidTo}
              />

              {/* Payment Mode */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Payment Mode
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {(['cash', 'upi', 'bank_transfer'] as const).map(mode => {
                  const isSelected = paymentMethod === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setPaymentMethod(mode)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#19D3E6' : '#FAF5EB',
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                          textTransform: 'uppercase',
                        }}
                      >
                        {mode === 'bank_transfer' ? 'Bank Transfer' : mode}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save CTA */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={handleSaveExpense}
                style={{
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Record Expense
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Clean Subtle Footer Branding */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
            }}
          >
            <BarChart3 size={15} color="#657080" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#657080' }}>
              Smart Finances. Better Management.
            </Text>
          </View>
        </ScrollView>

        {/* Edit Expense Modal */}
        {editingExpense && (
          <Modal
            visible={!!editingExpense}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingExpense(null)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: '#FAF5EB',
                  borderRadius: 24,
                  padding: 20,
                  width: '100%',
                  maxWidth: 380,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  maxHeight: '85%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}>
                    Edit Expense Record
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingExpense(null)}
                    activeOpacity={0.7}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} color="#657080" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Category */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Category
                  </Text>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
                  >
                    {CATEGORIES.map(cat => {
                      const isSelected = editCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setEditCategory(cat.id)}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 9999,
                            backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                            borderWidth: 1,
                            borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected ? '#0C192B' : '#657080',
                            }}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Amount */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Amount (₹)
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontWeight: '800',
                      fontSize: 14,
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    keyboardType="numeric"
                    value={editAmountRupees}
                    onChangeText={setEditAmountRupees}
                  />

                  {/* Description */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Description
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    value={editDescription}
                    onChangeText={setEditDescription}
                  />

                  {/* Date */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    value={editDate}
                    onChangeText={setEditDate}
                  />

                  {/* Paid To */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Paid To
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 12,
                    }}
                    value={editPaidTo}
                    onChangeText={setEditPaidTo}
                  />

                  {/* Delete button option in edit */}
                  <TouchableOpacity
                    onPress={() => {
                      const exp = editingExpense;
                      setEditingExpense(null);
                      handleDeleteExpense(exp);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: '#FFF1F2',
                      borderWidth: 1,
                      borderColor: '#FECDD3',
                      marginBottom: 14,
                    }}
                  >
                    <Trash2 size={13} color="#BE123C" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>
                      Delete this expense
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, paddingTop: 6 }}>
                  <TouchableOpacity
                    onPress={() => setEditingExpense(null)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: '#4F5330',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                        Save Changes
                      </Text>
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
