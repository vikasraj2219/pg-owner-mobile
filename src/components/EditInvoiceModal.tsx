import React, { useState, useEffect } from 'react';
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
import { X, Plus, Trash2, FileEdit } from 'lucide-react-native';
import { DueInvoiceItem } from '../types/api';
import { updateInvoiceApi, deleteInvoiceApi, InvoiceLineItemPayload } from '../api/invoices';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';

interface EditInvoiceModalProps {
  visible: boolean;
  invoice: DueInvoiceItem | null;
  onClose: () => void;
  onSuccess: () => void;
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

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  visible,
  invoice,
  onClose,
  onSuccess,
}) => {
  const [dueDateStr, setDueDateStr] = useState<string>('');
  const [items, setItems] = useState<
    Array<{
      id: string;
      category: 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage';
      description: string;
      amountRupees: string;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible && invoice) {
      setDueDateStr(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '');

      if (invoice.items && invoice.items.length > 0) {
        setItems(
          invoice.items.map((it, idx) => ({
            id: `${idx}-${Date.now()}`,
            category: (it.category as any) || 'rent',
            description: it.description || 'Charge',
            amountRupees: ((it.amountPaise || 0) / 100).toString(),
          })),
        );
      } else {
        setItems([
          {
            id: '1',
            category: 'rent',
            description: 'Monthly Rent',
            amountRupees: ((invoice.totalAmountPaise || 0) / 100).toString(),
          },
        ]);
      }
    }
  }, [visible, invoice]);

  if (!invoice) return null;

  const totalPaise = items.reduce((sum, item) => {
    const val = parseFloat(item.amountRupees) || 0;
    return sum + Math.round(val * 100);
  }, 0);

  const amountPaidPaise = invoice.amountPaidPaise || 0;

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
        return { ...it, [field]: value };
      }),
    );
  };

  const handleSave = async () => {
    if (totalPaise < amountPaidPaise) {
      Alert.alert(
        'Invalid Total',
        `New invoice total (${formatINR(totalPaise)}) cannot be less than already paid amount (${formatINR(amountPaidPaise)}).`,
      );
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

    setIsSubmitting(true);
    try {
      await updateInvoiceApi(invoice._id, {
        dueDate: dueDateStr ? new Date(dueDateStr).toISOString() : undefined,
        items: payloadItems,
      });

      Alert.alert('Updated! 🎉', 'Invoice updated successfully.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update invoice.';
      Alert.alert('Update Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (amountPaidPaise > 0) {
      Alert.alert(
        'Cannot Delete',
        `This invoice has recorded payments of ${formatINR(amountPaidPaise)}. Paid or partially paid invoices cannot be deleted to preserve financial audit trail.`,
      );
      return;
    }

    Alert.alert(
      'Delete Invoice?',
      `Are you sure you want to delete ${invoice.invoiceNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteInvoiceApi(invoice._id);
              Alert.alert('Deleted', `Invoice ${invoice.invoiceNumber} has been removed.`);
              onSuccess();
              onClose();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete invoice.';
              Alert.alert('Delete Failed', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
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
                <FileEdit size={20} color="#4F5330" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                  Edit Invoice
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                  {invoice.invoiceNumber} · {invoice.tenant?.fullName}
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
            {/* Due Date Info */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Due Date
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                {formatSafeDate(invoice.dueDate)}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                Month: {invoice.month}/{invoice.year}
              </Text>
            </View>

            {/* Line Items */}
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
                Line Items
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

                {/* Description and Amount */}
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

            {/* Financial Summary */}
            <View
              style={{
                backgroundColor: '#FAF5EB',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                  Total Invoice Amount:
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                  {formatINR(totalPaise)}
                </Text>
              </View>
              {amountPaidPaise > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803D' }}>
                    Already Paid:
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803D' }}>
                    - {formatINR(amountPaidPaise)}
                  </Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderColor: '#E5DDCD',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                  Remaining Balance:
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#E11D48' }}>
                  {formatINR(Math.max(0, totalPaise - amountPaidPaise))}
                </Text>
              </View>
            </View>

            {/* Actions: Save & Delete */}
            <View style={{ gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting || totalPaise <= 0}
                activeOpacity={0.85}
                style={{
                  height: 52,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSubmitting || totalPaise <= 0 ? '#CBD5E1' : '#4F5330',
                  shadowColor: '#4F5330',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isSubmitting || totalPaise <= 0 ? 0 : 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Save Invoice Changes
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                activeOpacity={0.7}
                style={{
                  height: 48,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFE4E6',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#E11D48" />
                ) : (
                  <Text style={{ color: '#E11D48', fontWeight: '800', fontSize: 14 }}>
                    🗑️ Delete Invoice
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
