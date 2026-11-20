import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Plus, Trash2, FileText, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchTenantsApi } from '../api/tenants';
import { createManualInvoiceApi, InvoiceLineItemPayload } from '../api/invoices';
import { formatINR } from '../utils/currency';
import { getTenantAvatar } from '../utils/assetImages';
import { Image } from 'react-native';

interface AddInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPropertyId?: string;
}

const CATEGORIES: Array<{
  id: 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage';
  label: string;
  emoji: string;
}> = [
  { id: 'rent', label: 'Rent', emoji: '🏠' },
  { id: 'electricity', label: 'Electricity', emoji: '⚡' },
  { id: 'mess', label: 'Mess', emoji: '🍽️' },
  { id: 'late_fee', label: 'Late Fee', emoji: '⚠️' },
  { id: 'damage', label: 'Damage', emoji: '🛠️' },
];

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  visible,
  onClose,
  onSuccess,
  defaultPropertyId,
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [dueDateDaysOffset, setDueDateDaysOffset] = useState<number>(0); // 0 = today, 5 = +5 days
  const [customDueDate, setCustomDueDate] = useState<string>('');

  const [items, setItems] = useState<
    Array<{
      id: string;
      category: 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage';
      description: string;
      amountRupees: string;
    }>
  >([
    {
      id: '1',
      category: 'rent',
      description: 'Monthly Rent',
      amountRupees: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tenants to choose from
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
    queryKey: ['tenants', defaultPropertyId],
    queryFn: () =>
      fetchTenantsApi({
        propertyId: defaultPropertyId,
        status: 'active',
      }),
    enabled: visible,
  });

  const filteredTenants = tenants.filter(t => {
    if (!tenantSearch.trim()) return true;
    const q = tenantSearch.toLowerCase();
    return (
      t.fullName?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q) ||
      t.currentBed?.bedNumber?.toLowerCase().includes(q)
    );
  });

  const selectedTenant = tenants.find(t => t._id === selectedTenantId);

  // Calculate target due date
  const getCalculatedDueDate = (): Date => {
    if (customDueDate.trim()) {
      const d = new Date(customDueDate);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date();
    d.setDate(d.getDate() + dueDateDaysOffset);
    return d;
  };

  const totalPaise = items.reduce((sum, item) => {
    const val = parseFloat(item.amountRupees) || 0;
    return sum + Math.round(val * 100);
  }, 0);

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        category: 'electricity',
        description: 'Electricity Charges',
        amountRupees: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: 'category' | 'description' | 'amountRupees',
    value: string,
  ) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        if (field === 'category') {
          return {
            ...it,
            category: value as 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage',
            description:
              it.description === 'Monthly Rent' ||
              it.description === 'Electricity Charges' ||
              it.description === 'Mess Fee' ||
              it.description === 'Late Payment Fee' ||
              it.description === 'Room Damage'
                ? value === 'rent'
                  ? 'Monthly Rent'
                  : value === 'electricity'
                    ? 'Electricity Charges'
                    : value === 'mess'
                      ? 'Mess Fee'
                      : value === 'late_fee'
                        ? 'Late Payment Fee'
                        : 'Room Damage'
                : it.description,
          };
        }
        return { ...it, [field]: value };
      }),
    );
  };

  const handleSubmit = async () => {
    if (!selectedTenantId) {
      Alert.alert('Tenant Required', 'Please select a tenant for this invoice.');
      return;
    }

    if (totalPaise <= 0) {
      Alert.alert('Invalid Amount', 'Total invoice amount must be greater than ₹0.');
      return;
    }

    const payloadItems: InvoiceLineItemPayload[] = items.map(it => ({
      description: it.description.trim() || `${it.category.toUpperCase()} Charge`,
      amountPaise: Math.round((parseFloat(it.amountRupees) || 0) * 100),
      category: it.category,
    }));

    if (payloadItems.some(it => it.amountPaise <= 0)) {
      Alert.alert('Invalid Item Amount', 'Every line item must have an amount greater than ₹0.');
      return;
    }

    const dueDate = getCalculatedDueDate();

    setIsSubmitting(true);
    try {
      await createManualInvoiceApi({
        tenantId: selectedTenantId,
        propertyId: selectedTenant?.property?._id || defaultPropertyId,
        dueDate: dueDate.toISOString(),
        month: dueDate.getMonth() + 1,
        year: dueDate.getFullYear(),
        items: payloadItems,
      });

      Alert.alert('Invoice Created! 🎉', 'Manual invoice has been generated successfully.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create manual invoice.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <View
          style={{
            backgroundColor: '#FAF5EB',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#E5DDCD',
            maxHeight: '92%',
            paddingTop: 18,
            paddingHorizontal: 20,
            paddingBottom: Platform.OS === 'ios' ? 32 : 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderColor: '#E5DDCD',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} color="#4F5330" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                  Add Manual Invoice
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                  Generate custom or ad-hoc dues for tenant
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#0C192B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 12 }}
          >
            {/* 1. Select Tenant */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              1. Select Tenant *
            </Text>

            {/* Tenant Search Box */}
            <TextInput
              value={tenantSearch}
              onChangeText={setTenantSearch}
              placeholder="🔍 Search tenant by name, bed, or phone..."
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 9,
                fontSize: 13,
                fontWeight: '600',
                color: '#0C192B',
                backgroundColor: '#FFFDF8',
                marginBottom: 8,
              }}
            />

            {isLoadingTenants ? (
              <ActivityIndicator size="small" color="#4F5330" style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                style={{ marginBottom: 14 }}
              >
                {filteredTenants.map(t => {
                  const isSelected = t._id === selectedTenantId;
                  const avatar = getTenantAvatar(t);
                  return (
                    <TouchableOpacity
                      key={t._id}
                      onPress={() => setSelectedTenantId(t._id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Image source={avatar} style={{ width: 28, height: 28, borderRadius: 14 }} />
                      <View>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: '#0C192B',
                          }}
                        >
                          {t.fullName}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#657080' }}>
                          Bed {t.currentBed?.bedNumber || 'N/A'}
                        </Text>
                      </View>
                      {isSelected && <Check size={14} color="#0C192B" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 2. Due Date */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              2. Due Date
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Today', offset: 0 },
                { label: 'In 5 Days', offset: 5 },
                { label: 'In 10 Days', offset: 10 },
                { label: 'End of Month', offset: 15 },
              ].map(opt => {
                const isSelected = dueDateDaysOffset === opt.offset && !customDueDate;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      setDueDateDaysOffset(opt.offset);
                      setCustomDueDate('');
                    }}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#4F5330' : '#FFFDF8',
                      borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : '#0C192B',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Line Items */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                3. Invoice Items
              </Text>
              <TouchableOpacity
                onPress={handleAddItem}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} color="#4F5330" strokeWidth={3} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#4F5330' }}>
                  + Add Line Item
                </Text>
              </TouchableOpacity>
            </View>

            {items.map(item => (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                {/* Category Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 8 }}
                >
                  {CATEGORIES.map(cat => {
                    const isSelected = item.category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleUpdateItem(item.id, 'category', cat.id)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          backgroundColor: isSelected ? '#FAF5EB' : '#FFFFFF',
                          borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                        }}
                      >
                        <Text style={{ fontSize: 11 }}>{cat.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#4F5330' : '#657080',
                          }}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Description and Amount Row */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={item.description}
                    onChangeText={txt => handleUpdateItem(item.id, 'description', txt)}
                    placeholder="Description"
                    placeholderTextColor="#94A3B8"
                    style={{
                      flex: 1.5,
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#0C192B',
                      backgroundColor: '#FAF5EB',
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      backgroundColor: '#FAF5EB',
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '800', color: '#657080', marginRight: 4 }}
                    >
                      ₹
                    </Text>
                    <TextInput
                      value={item.amountRupees}
                      onChangeText={txt => handleUpdateItem(item.id, 'amountRupees', txt)}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        fontSize: 13,
                        fontWeight: '800',
                        color: '#0C192B',
                      }}
                    />
                  </View>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#FFE4E6',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={15} color="#E11D48" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Total Summary Card */}
            <View
              style={{
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                Total Invoice Payable:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#4F5330' }}>
                {formatINR(totalPaise)}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || totalPaise <= 0 || !selectedTenantId}
              activeOpacity={0.85}
              style={{
                height: 52,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  isSubmitting || totalPaise <= 0 || !selectedTenantId ? '#CBD5E1' : '#4F5330',
                shadowColor: '#4F5330',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isSubmitting || totalPaise <= 0 ? 0 : 0.25,
                shadowRadius: 6,
                elevation: 3,
                marginBottom: 6,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  Issue Invoice {totalPaise > 0 ? formatINR(totalPaise) : ''}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
