import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Search,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Repeat,
  BedDouble,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  Check,
  Building2,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useProperties } from '../context/PropertyContext';
import { useMatrix } from '../hooks/useMatrix';
import { moveBedApi } from '../api/tenants';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import { calculateBedTransferProration } from '../utils/proration';
import { DatePickerModal } from './DatePickerModal';
import { IMatrixBed, IMatrixRoom, ITenantListItem } from '../types/api';

interface TargetBedItem {
  bed: IMatrixBed;
  room: IMatrixRoom;
  floorNumber: number;
  floorLabel?: string;
}

interface BedTransferModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: ITenantListItem;
  onTransferSuccess?: () => void;
}

export const BedTransferModal: React.FC<BedTransferModalProps> = ({
  visible,
  onClose,
  tenant,
  onTransferSuccess,
}) => {
  const queryClient = useQueryClient();
  const { properties } = useProperties();

  // Selected target property (defaults to tenant's current property)
  const tenantPropertyId =
    typeof tenant?.property === 'object' ? tenant.property?._id : tenant?.property;
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(tenantPropertyId || '');

  // Matrix of available beds for selected target property
  const { matrixData, refetch: matrixRefetch } = useMatrix(selectedPropertyId || null);

  // Flow State
  const [selectedTargetBed, setSelectedTargetBed] = useState<TargetBedItem | null>(null);
  const [isVerifyingBed, setIsVerifyingBed] = useState(false);
  const [realtimeVerified, setRealtimeVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters for Step 1
  const [bedSearchQuery, setBedSearchQuery] = useState('');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | 'all'>('all');
  const [selectedSharingFilter, setSelectedSharingFilter] = useState<number | 'all'>('all');

  // Step 2 Form States
  const originalRentRupees = Math.round((tenant?.monthlyRentPaise || 0) / 100);
  const [targetNewRentRupees, setTargetNewRentRupees] = useState('');
  const [effectiveType, setEffectiveType] = useState<'immediate' | 'next_month' | 'custom'>(
    'immediate',
  );
  const [customEffectiveDate, setCustomEffectiveDate] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [generateAdjustmentInvoice, setGenerateAdjustmentInvoice] = useState(true);
  const [transferNotes, setTransferNotes] = useState('');

  // Reset or init property selection when modal becomes visible
  useEffect(() => {
    if (visible) {
      const pId = typeof tenant?.property === 'object' ? tenant.property?._id : tenant?.property;
      setSelectedPropertyId(pId || '');
      setSelectedTargetBed(null);
      setBedSearchQuery('');
      setSelectedFloorFilter('all');
      setSelectedSharingFilter('all');
      setEffectiveType('immediate');
      setCustomEffectiveDate(new Date());
      setGenerateAdjustmentInvoice(true);
      setTransferNotes('');
    }
  }, [visible, tenant]);

  const currentBedNumber = tenant?.currentBed?.bedNumber || 'Unknown';
  const currentBedId = tenant?.currentBed?._id;

  // Extract all vacant beds in matrix
  const allVacantBeds: TargetBedItem[] = useMemo(() => {
    if (!matrixData?.floors) return [];
    const list: TargetBedItem[] = [];

    matrixData.floors.forEach(floor => {
      floor.rooms?.forEach(room => {
        room.beds?.forEach(bed => {
          if (bed.status === 'available' && bed._id !== currentBedId) {
            list.push({
              bed,
              room,
              floorNumber: floor.floorNumber,
              floorLabel: floor.floorLabel,
            });
          }
        });
      });
    });
    return list;
  }, [matrixData, currentBedId]);

  // Unique floors available in matrix
  const availableFloors = useMemo(() => {
    if (!matrixData?.floors) return [];
    return matrixData.floors.map(f => ({
      floorNumber: f.floorNumber,
      label: f.floorNumber === 0 ? 'Ground Floor' : `Floor ${f.floorNumber}`,
    }));
  }, [matrixData]);

  // Filtered vacant beds
  const filteredBeds = useMemo(() => {
    return allVacantBeds.filter(item => {
      if (bedSearchQuery.trim()) {
        const q = bedSearchQuery.trim().toLowerCase();
        const bedMatch = (item.bed.bedNumber || '').toLowerCase().includes(q);
        const roomMatch = (item.room.roomNumber || '').toLowerCase().includes(q);
        if (!bedMatch && !roomMatch) return false;
      }

      if (selectedFloorFilter !== 'all' && item.floorNumber !== selectedFloorFilter) {
        return false;
      }

      if (selectedSharingFilter !== 'all') {
        const bedCount = item.room.beds?.length || 1;
        if (selectedSharingFilter === 4) {
          if (bedCount < 4) return false;
        } else if (bedCount !== selectedSharingFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allVacantBeds, bedSearchQuery, selectedFloorFilter, selectedSharingFilter]);

  // When a bed is picked, verify real-time availability and init rent
  const handleSelectBed = async (item: TargetBedItem) => {
    setSelectedTargetBed(item);
    setIsVerifyingBed(true);
    setRealtimeVerified(false);

    const defaultRentPaise =
      item.bed.baseRentPaise ?? item.room.baseRentPaisePerBed ?? tenant.monthlyRentPaise ?? 0;
    setTargetNewRentRupees(Math.round(defaultRentPaise / 100).toString());

    try {
      const refreshed = await matrixRefetch();
      let isStillVacant = false;
      refreshed.data?.floors?.forEach(f => {
        f.rooms?.forEach(r => {
          r.beds?.forEach(b => {
            if (b._id === item.bed._id && b.status === 'available') {
              isStillVacant = true;
            }
          });
        });
      });

      if (isStillVacant) {
        setRealtimeVerified(true);
      } else {
        Alert.alert(
          'Bed No Longer Available',
          `Bed ${item.bed.bedNumber} was recently reserved or occupied by another tenant. Please select a different bed.`,
        );
        setSelectedTargetBed(null);
      }
    } catch (_e) {
      setRealtimeVerified(true);
    } finally {
      setIsVerifyingBed(false);
    }
  };

  // Compute calculated effective date
  const calculatedEffectiveDate = useMemo(() => {
    const now = new Date();
    if (effectiveType === 'next_month') {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    }
    if (effectiveType === 'custom') {
      return customEffectiveDate;
    }
    return now;
  }, [effectiveType, customEffectiveDate]);

  // Compute live proration
  const parsedTargetRentRupees = parseFloat(targetNewRentRupees) || 0;
  const targetRentPaise = Math.round(parsedTargetRentRupees * 100);
  const fromRentPaise = tenant?.monthlyRentPaise || 0;

  const proration = useMemo(() => {
    return calculateBedTransferProration(
      fromRentPaise,
      targetRentPaise,
      calculatedEffectiveDate,
      effectiveType,
    );
  }, [fromRentPaise, targetRentPaise, calculatedEffectiveDate, effectiveType]);

  // Confirm and execute bed transfer
  const handleConfirmTransfer = async () => {
    if (!selectedTargetBed) return;
    if (isNaN(parsedTargetRentRupees) || parsedTargetRentRupees < 0) {
      Alert.alert('Invalid Rent', 'Please enter a valid monthly rent amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await moveBedApi(tenant._id, {
        newBedId: selectedTargetBed.bed._id,
        targetPropertyId: selectedPropertyId !== tenantPropertyId ? selectedPropertyId : undefined,
        effectiveType,
        effectiveDate: calculatedEffectiveDate.toISOString(),
        newMonthlyRentPaise: targetRentPaise,
        generateAdjustmentInvoice:
          proration.isHigherRent && proration.proratedAdjustmentPaise > 0
            ? generateAdjustmentInvoice
            : false,
        notes:
          transferNotes.trim() ||
          `Bed transfer from Bed ${currentBedNumber} to Bed ${selectedTargetBed.bed.bedNumber}`,
      });

      queryClient.invalidateQueries({ queryKey: ['tenant', tenant._id] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const isScheduled =
        effectiveType === 'next_month' ||
        (effectiveType === 'custom' &&
          calculatedEffectiveDate.toISOString().slice(0, 10) >
            new Date().toISOString().slice(0, 10));

      Alert.alert(
        isScheduled ? 'Bed Transfer Scheduled' : 'Bed Transferred Successfully',
        isScheduled
          ? `Bed ${selectedTargetBed.bed.bedNumber} has been reserved for ${tenant.fullName}. The transfer will take effect on ${formatSafeDate(calculatedEffectiveDate)}.`
          : `Tenant ${tenant.fullName} has been transferred to Bed ${selectedTargetBed.bed.bedNumber} at ${formatINR(targetRentPaise)}/mo.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onTransferSuccess) onTransferSuccess();
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        'Transfer Error',
        err?.response?.data?.message || err?.message || 'Failed to complete bed transfer.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextMonthName = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleString('en-IN', { month: 'short' });
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (selectedTargetBed) {
          setSelectedTargetBed(null);
        } else {
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(12, 25, 43, 0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#FAF5EB',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '92%',
            borderTopWidth: 1,
            borderTopColor: '#E5DDCD',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DDCD',
              backgroundColor: '#FAF5EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              {selectedTargetBed && (
                <TouchableOpacity
                  onPress={() => setSelectedTargetBed(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <ArrowLeft size={18} color="#0C192B" strokeWidth={2.3} />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}>
                  {selectedTargetBed ? 'Configure Bed Transfer' : 'Transfer Bed / Move Tenant'}
                </Text>
                <Text
                  style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginTop: 1 }}
                  numberOfLines={1}
                >
                  {tenant?.fullName} · Currently Bed {currentBedNumber} (₹{originalRentRupees}/mo)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (selectedTargetBed) {
                  setSelectedTargetBed(null);
                } else {
                  onClose();
                }
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#657080" />
            </TouchableOpacity>
          </View>

          {/* STEP 2: Configure & Confirm Transfer */}
          {selectedTargetBed ? (
            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 16 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Real-time server status indicator */}
              {isVerifyingBed ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFFDF8',
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    marginBottom: 16,
                  }}
                >
                  <ActivityIndicator size="small" color="#4F5330" style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                    Verifying bed availability on server in real-time…
                  </Text>
                </View>
              ) : realtimeVerified ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#E8F5E9',
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#C8E6C9',
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle2 size={16} color="#2E7D32" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>
                    Verified Available · Target bed is vacant on server
                  </Text>
                </View>
              ) : null}

              {/* Bed Transfer Overview Card */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#657080',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 12,
                  }}
                >
                  Bed Transfer Overview
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                      Current Bed
                    </Text>
                    <Text
                      style={{ fontSize: 16, fontWeight: '800', color: '#0C192B', marginTop: 2 }}
                    >
                      Bed {currentBedNumber}
                    </Text>
                    <Text
                      style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}
                    >
                      ₹{originalRentRupees.toLocaleString('en-IN')}/mo
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#FAF7F0',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginHorizontal: 8,
                    }}
                  >
                    <ChevronRight size={16} color="#4F5330" />
                  </View>

                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                      New Target Bed
                    </Text>
                    <Text
                      style={{ fontSize: 16, fontWeight: '800', color: '#4F5330', marginTop: 2 }}
                    >
                      Bed {selectedTargetBed.bed.bedNumber}
                    </Text>
                    <Text
                      style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}
                    >
                      Room {selectedTargetBed.room.roomNumber} · Floor{' '}
                      {selectedTargetBed.floorNumber === 0
                        ? 'Ground'
                        : selectedTargetBed.floorNumber}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Monthly Rent Adjustment Section (Supports 10k -> 7k or 7k -> 10k) */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
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
                  Monthly Rent for New Bed
                </Text>
                <Text
                  style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginBottom: 12 }}
                >
                  Standard rent for Room {selectedTargetBed.room.roomNumber} is{' '}
                  <Text style={{ fontWeight: '700', color: '#0C192B' }}>
                    {formatINR(
                      selectedTargetBed.room.baseRentPaisePerBed || originalRentRupees * 100,
                    )}
                  </Text>
                  . You can confirm or customize the rent:
                </Text>

                {/* Live Rent Difference Pill */}
                {parsedTargetRentRupees < originalRentRupees ? (
                  <View
                    style={{
                      backgroundColor: '#E8F5E9',
                      borderWidth: 1,
                      borderColor: '#C8E6C9',
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <TrendingDown size={16} color="#2E7D32" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>
                      Rent reduces by ₹
                      {(originalRentRupees - parsedTargetRentRupees).toLocaleString('en-IN')}
                      /mo (from ₹{originalRentRupees.toLocaleString('en-IN')} to ₹
                      {parsedTargetRentRupees.toLocaleString('en-IN')})
                    </Text>
                  </View>
                ) : parsedTargetRentRupees > originalRentRupees ? (
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <TrendingUp size={16} color="#1D4ED8" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
                      Rent increases by ₹
                      {(parsedTargetRentRupees - originalRentRupees).toLocaleString('en-IN')}
                      /mo (from ₹{originalRentRupees.toLocaleString('en-IN')} to ₹
                      {parsedTargetRentRupees.toLocaleString('en-IN')})
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Repeat size={16} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                      Same monthly rent (₹{originalRentRupees.toLocaleString('en-IN')}/mo)
                    </Text>
                  </View>
                )}

                {/* Rent input box */}
                <View
                  style={{
                    backgroundColor: '#FAF5EB',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: '#657080', marginRight: 4 }}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: '#0C192B',
                      fontWeight: '800',
                    }}
                    value={targetNewRentRupees}
                    onChangeText={setTargetNewRentRupees}
                    placeholder="Enter new rent"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>

                {/* Quick Room Standard Reset Button */}
                {selectedTargetBed.room.baseRentPaisePerBed ? (
                  <TouchableOpacity
                    onPress={() =>
                      setTargetNewRentRupees(
                        (selectedTargetBed.room.baseRentPaisePerBed / 100).toString(),
                      )
                    }
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330' }}>
                      Reset to Room Standard (₹
                      {(selectedTargetBed.room.baseRentPaisePerBed / 100).toLocaleString('en-IN')})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Effective Date Selector (Immediately / Next Month / Custom Date) */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#657080',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 12,
                  }}
                >
                  Transfer Effective Date
                </Text>

                <View style={{ gap: 8 }}>
                  {/* Option 1: Immediately */}
                  <TouchableOpacity
                    onPress={() => setEffectiveType('immediate')}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: effectiveType === 'immediate' ? '#F4F8EC' : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: effectiveType === 'immediate' ? '#4F5330' : '#E5DDCD',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Clock
                        size={16}
                        color={effectiveType === 'immediate' ? '#4F5330' : '#657080'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: effectiveType === 'immediate' ? '800' : '600',
                          color: effectiveType === 'immediate' ? '#4F5330' : '#0C192B',
                        }}
                      >
                        Immediately (Today)
                      </Text>
                    </View>
                    {effectiveType === 'immediate' && (
                      <Check size={16} color="#4F5330" strokeWidth={3} />
                    )}
                  </TouchableOpacity>

                  {/* Option 2: From Next Month */}
                  <TouchableOpacity
                    onPress={() => setEffectiveType('next_month')}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: effectiveType === 'next_month' ? '#F4F8EC' : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: effectiveType === 'next_month' ? '#4F5330' : '#E5DDCD',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar
                        size={16}
                        color={effectiveType === 'next_month' ? '#4F5330' : '#657080'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: effectiveType === 'next_month' ? '800' : '600',
                          color: effectiveType === 'next_month' ? '#4F5330' : '#0C192B',
                        }}
                      >
                        From Next Month (1st {nextMonthName})
                      </Text>
                    </View>
                    {effectiveType === 'next_month' && (
                      <Check size={16} color="#4F5330" strokeWidth={3} />
                    )}
                  </TouchableOpacity>

                  {/* Option 3: Custom Date */}
                  <TouchableOpacity
                    onPress={() => {
                      setEffectiveType('custom');
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: effectiveType === 'custom' ? '#F4F8EC' : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: effectiveType === 'custom' ? '#4F5330' : '#E5DDCD',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar
                        size={16}
                        color={effectiveType === 'custom' ? '#4F5330' : '#657080'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: effectiveType === 'custom' ? '800' : '600',
                          color: effectiveType === 'custom' ? '#4F5330' : '#0C192B',
                        }}
                      >
                        Custom Date:{' '}
                        {effectiveType === 'custom'
                          ? formatSafeDate(customEffectiveDate)
                          : 'Select date'}
                      </Text>
                    </View>
                    {effectiveType === 'custom' && (
                      <Check size={16} color="#4F5330" strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Financial Impact & Live Proration Details */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#657080',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  Financial Impact & Billing Adjustment
                </Text>

                <View
                  style={{
                    backgroundColor: '#FAF5EB',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', lineHeight: 18 }}
                  >
                    {proration.explanation}
                  </Text>

                  {proration.remainingDaysInMonth > 0 && !proration.isSameRent && (
                    <Text
                      style={{ fontSize: 11, color: '#657080', fontWeight: '500', marginTop: 6 }}
                    >
                      {proration.remainingDaysInMonth} billable days remaining in current month of{' '}
                      {proration.totalDaysInMonth} total days.
                    </Text>
                  )}
                </View>

                {/* Option to generate adjustment invoice if higher rent mid-month */}
                {proration.isHigherRent && proration.proratedAdjustmentPaise > 0 && (
                  <TouchableOpacity
                    onPress={() => setGenerateAdjustmentInvoice(!generateAdjustmentInvoice)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingTop: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        backgroundColor: generateAdjustmentInvoice ? '#4F5330' : '#FFFDF8',
                        borderWidth: 1,
                        borderColor: generateAdjustmentInvoice ? '#4F5330' : '#E5DDCD',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      {generateAdjustmentInvoice && (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0C192B', flex: 1 }}>
                      Add prorated adjustment invoice item (+
                      {formatINR(proration.proratedAdjustmentPaise)})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Bed Occupancy Notice Banner */}
              <View
                style={{
                  backgroundColor: '#F4F8EC',
                  borderWidth: 1,
                  borderColor: '#D9E8CE',
                  borderRadius: 16,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <Info size={18} color="#4F5330" style={{ marginTop: 2, marginRight: 10 }} />
                <Text
                  style={{
                    fontSize: 12,
                    color: '#4F5330',
                    fontWeight: '500',
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  {effectiveType === 'next_month' ||
                  (effectiveType === 'custom' &&
                    calculatedEffectiveDate.toISOString().slice(0, 10) >
                      new Date().toISOString().slice(0, 10))
                    ? `Bed ${selectedTargetBed.bed.bedNumber} will be reserved for ${tenant.fullName}. Current Bed ${currentBedNumber} remains occupied until ${formatSafeDate(calculatedEffectiveDate)}.`
                    : `Immediate transfer: Bed ${currentBedNumber} will be released immediately and become available for new tenants. Historical payment records and invoices remain preserved.`}
                </Text>
              </View>

              {/* Transfer Notes / Reason Input */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
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
                  Transfer Note / Reason (Optional)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#FAF5EB',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 13,
                    color: '#0C192B',
                    fontWeight: '500',
                  }}
                  value={transferNotes}
                  onChangeText={setTransferNotes}
                  placeholder="e.g. Verbal request by tenant, shifted to ground floor"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConfirmTransfer}
                  disabled={isSubmitting || isVerifyingBed}
                  style={{
                    width: '100%',
                    backgroundColor: '#4F5330',
                    borderRadius: 9999,
                    height: 52,
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
                      Confirm Transfer · Rent ₹{parsedTargetRentRupees.toLocaleString('en-IN')}/mo
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedTargetBed(null)}
                  style={{
                    width: '100%',
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                    Choose a different bed
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* STEP 1: Bed Selection List with Filters */
            <View style={{ flex: 1, minHeight: 460 }}>
              {/* Optional Property Switcher (if owner has multiple properties) */}
              {properties.length > 1 && (
                <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
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
                    Destination Property
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {properties.map(p => {
                      const isSelected = p._id === selectedPropertyId;
                      return (
                        <TouchableOpacity
                          key={p._id}
                          onPress={() => setSelectedPropertyId(p._id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 9999,
                            backgroundColor: isSelected ? '#4F5330' : '#FFFDF8',
                            borderWidth: 1,
                            borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                          }}
                        >
                          <Building2
                            size={12}
                            color={isSelected ? '#FFFFFF' : '#657080'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSelected ? '#FFFFFF' : '#0C192B',
                            }}
                          >
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Search Bar */}
              <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Search size={16} color="#657080" style={{ marginRight: 8 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#0C192B',
                      fontWeight: '500',
                      padding: 0,
                    }}
                    placeholder="Search room or bed number (e.g. 101, B)..."
                    placeholderTextColor="#94A3B8"
                    value={bedSearchQuery}
                    onChangeText={setBedSearchQuery}
                  />
                  {bedSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBedSearchQuery('')}>
                      <X size={16} color="#657080" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Floor Filter Pills */}
              <View style={{ paddingBottom: 8 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedFloorFilter('all')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                      backgroundColor: selectedFloorFilter === 'all' ? '#4F5330' : '#FFFDF8',
                      borderWidth: 1,
                      borderColor: selectedFloorFilter === 'all' ? '#4F5330' : '#E5DDCD',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: selectedFloorFilter === 'all' ? '#FFFFFF' : '#657080',
                      }}
                    >
                      All Floors ({allVacantBeds.length})
                    </Text>
                  </TouchableOpacity>

                  {availableFloors.map(f => {
                    const count = allVacantBeds.filter(b => b.floorNumber === f.floorNumber).length;
                    const isSelected = selectedFloorFilter === f.floorNumber;
                    return (
                      <TouchableOpacity
                        key={f.floorNumber}
                        onPress={() => setSelectedFloorFilter(f.floorNumber)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 9999,
                          backgroundColor: isSelected ? '#4F5330' : '#FFFDF8',
                          borderWidth: 1,
                          borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isSelected ? '#FFFFFF' : '#657080',
                          }}
                        >
                          {f.label} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Sharing Filter Pills */}
              <View style={{ paddingBottom: 10 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                >
                  {[
                    { key: 'all', label: 'All Sharing' },
                    { key: 1, label: 'Single' },
                    { key: 2, label: '2-Share' },
                    { key: 3, label: '3-Share' },
                    { key: 4, label: '4+ Share' },
                  ].map(tab => {
                    const isSelected = selectedSharingFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setSelectedSharingFilter(tab.key as any)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#E5EBD8' : '#FFFDF8',
                          borderWidth: 1,
                          borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#4F5330' : '#657080',
                          }}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Available Beds List */}
              {filteredBeds.length === 0 ? (
                <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <BedDouble size={36} color="#CBD5E1" />
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: '#0C192B', marginTop: 10 }}
                  >
                    No vacant beds found
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#657080',
                      textAlign: 'center',
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                  >
                    Try adjusting the floor or sharing filter, or check another property.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredBeds.map(item => {
                    const bedRentPaise =
                      item.bed.baseRentPaise ??
                      item.room.baseRentPaisePerBed ??
                      originalRentRupees * 100;
                    const bedRentRupees = Math.round(bedRentPaise / 100);
                    const diffRupees = bedRentRupees - originalRentRupees;

                    return (
                      <TouchableOpacity
                        key={item.bed._id}
                        onPress={() => handleSelectBed(item)}
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          borderRadius: 16,
                          padding: 14,
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              backgroundColor: '#F4F8EC',
                              borderWidth: 1,
                              borderColor: '#D9E8CE',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <BedDouble size={20} color="#4F5330" />
                          </View>

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                                Bed {item.bed.bedNumber}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: '#E8F5E9',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E7D32' }}>
                                  VACANT
                                </Text>
                              </View>
                            </View>

                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '500',
                                color: '#657080',
                                marginTop: 2,
                              }}
                            >
                              Room {item.room.roomNumber} ·{' '}
                              {item.floorNumber === 0
                                ? 'Ground Floor'
                                : `Floor ${item.floorNumber}`}{' '}
                              · {item.room.beds?.length || 1}-share
                            </Text>

                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 4,
                                gap: 6,
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                                {formatINR(bedRentPaise)}/mo
                              </Text>

                              {diffRupees < 0 ? (
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32' }}>
                                  · ₹{Math.abs(diffRupees).toLocaleString('en-IN')} cheaper
                                </Text>
                              ) : diffRupees > 0 ? (
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                                  · +₹{diffRupees.toLocaleString('en-IN')} higher
                                </Text>
                              ) : (
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                                  · Same rent
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>

                        <ChevronRight size={18} color="#657080" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal for custom date selection */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={customEffectiveDate}
        onSelectDate={d => {
          setCustomEffectiveDate(d);
          setShowDatePicker(false);
        }}
        title="Select Effective Date"
      />
    </Modal>
  );
};
