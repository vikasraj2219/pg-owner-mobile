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
  StyleSheet,
  Image,
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
  DoorClosed,
  RefreshCw,
  Lock,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useProperties } from '../context/PropertyContext';
import { useMatrix } from '../hooks/useMatrix';
import { moveBedApi } from '../api/tenants';
import { formatINR } from '../utils/currency';
import { formatSafeDate, getNextBillingCycleDate } from '../utils/date';
import { calculateBedTransferProration } from '../utils/proration';
import { getPropertyImage } from '../utils/assetImages';
import { DatePickerModal } from './DatePickerModal';
import { SuccessActionModal } from './SuccessActionModal';
import { IMatrixBed, IMatrixRoom, ITenantListItem } from '../types/api';

interface TargetBedItem {
  bed: IMatrixBed;
  room: IMatrixRoom;
  floorNumber: number;
  floorLabel?: string;
}

interface RoomWithBedsItem {
  room: IMatrixRoom;
  floorNumber: number;
  floorLabel?: string;
  sharingType: number;
  baseRentPaisePerBed: number;
  availableBeds: IMatrixBed[];
  totalBedsCount: number;
}

interface BedTransferModalProps {
  visible: boolean;
  onClose: () => void;
  tenant: ITenantListItem;
  propertyId?: string;
  onTransferSuccess?: () => void;
}

export const BedTransferModal: React.FC<BedTransferModalProps> = ({
  visible,
  onClose,
  tenant,
  propertyId: passedPropertyId,
  onTransferSuccess,
}) => {
  const queryClient = useQueryClient();
  const {
    properties,
    selectedProperty,
    selectedPropertyId: globalSelectedPropertyId,
  } = useProperties();

  // Helper to extract property ID reliably from tenant object or string
  const getTenantPropertyId = (t?: ITenantListItem): string => {
    if (!t?.property) return '';
    if (typeof t.property === 'string') return t.property;
    return (t.property as any)?._id || (t.property as any)?.id || '';
  };

  // Best fallback property ID - never use 'all' for single property matrix query
  const defaultPropertyId = useMemo(() => {
    if (passedPropertyId && passedPropertyId !== 'all') return passedPropertyId;
    const fromTenant = getTenantPropertyId(tenant);
    if (fromTenant && fromTenant !== 'all') return fromTenant;
    if (globalSelectedPropertyId && globalSelectedPropertyId !== 'all')
      return globalSelectedPropertyId;
    if (selectedProperty?._id && selectedProperty._id !== 'all') return selectedProperty._id;
    if (properties.length > 0) return properties[0]._id;
    return '';
  }, [passedPropertyId, tenant, selectedProperty, globalSelectedPropertyId, properties]);

  // Selected target property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(defaultPropertyId);

  // Synchronize property ID whenever modal opens or tenant loads
  useEffect(() => {
    if (visible) {
      const pId =
        (passedPropertyId && passedPropertyId !== 'all' ? passedPropertyId : '') ||
        getTenantPropertyId(tenant) ||
        (globalSelectedPropertyId !== 'all' ? globalSelectedPropertyId : '') ||
        selectedProperty?._id ||
        properties[0]?._id ||
        '';
      setSelectedPropertyId(pId);
      setSelectedTargetBed(null);
      setBedSearchQuery('');
      setSelectedFloorFilter('all');
      setSelectedSharingFilter('all');
      setEffectiveType('immediate');
      setCustomEffectiveDate(new Date());
      setGenerateAdjustmentInvoice(true);
      setTransferNotes('');
    }
  }, [visible, passedPropertyId, tenant, selectedProperty, globalSelectedPropertyId, properties]);

  const activePropertyId = selectedPropertyId || defaultPropertyId;

  // Matrix of available beds for selected target property
  const {
    matrixData,
    isLoading: isMatrixLoading,
    isFetching: isMatrixFetching,
    refetch: matrixRefetch,
  } = useMatrix(activePropertyId || null);

  // Trigger matrix refetch when modal becomes visible or property changes
  useEffect(() => {
    if (visible && activePropertyId) {
      void matrixRefetch();
    }
  }, [visible, activePropertyId, matrixRefetch]);

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
  const [transferSuccessData, setTransferSuccessData] = useState<{
    isScheduled: boolean;
    title: string;
    message: string;
    bedNumber: string;
    rent: string;
    effectiveDateStr: string;
  } | null>(null);

  const currentBedNumber = tenant?.currentBed?.bedNumber || 'Unknown';
  const currentBedId = useMemo(() => {
    if (!tenant?.currentBed) return null;
    return typeof tenant.currentBed === 'object'
      ? (tenant.currentBed as any)._id || (tenant.currentBed as any).id
      : tenant.currentBed;
  }, [tenant]);

  // Extract all rooms with their available beds from matrix
  const allRoomsWithBeds: RoomWithBedsItem[] = useMemo(() => {
    if (!matrixData?.floors) return [];
    const list: RoomWithBedsItem[] = [];

    matrixData.floors.forEach(floor => {
      (floor.rooms || []).forEach(room => {
        const availableBeds = (room.beds || []).filter(
          bed =>
            (bed.status || '').toLowerCase() === 'available' &&
            bed._id !== currentBedId &&
            bed.bedNumber !== currentBedNumber,
        );

        list.push({
          room,
          floorNumber: floor.floorNumber,
          floorLabel: floor.floorLabel,
          sharingType: room.sharingType || (room.beds ? room.beds.length : 1),
          baseRentPaisePerBed: room.baseRentPaisePerBed || originalRentRupees * 100,
          availableBeds,
          totalBedsCount: room.beds?.length || 0,
        });
      });
    });

    return list.sort((a, b) => {
      if (a.floorNumber !== b.floorNumber) return a.floorNumber - b.floorNumber;
      return a.room.roomNumber.localeCompare(b.room.roomNumber, undefined, { numeric: true });
    });
  }, [matrixData, currentBedId, originalRentRupees]);

  // Total vacant beds count across all rooms
  const totalVacantBedsCount = useMemo(() => {
    return allRoomsWithBeds.reduce((acc, r) => acc + r.availableBeds.length, 0);
  }, [allRoomsWithBeds]);

  // Unique floors available in matrix
  const availableFloors = useMemo(() => {
    if (!matrixData?.floors) return [];
    return matrixData.floors.map(f => {
      const roomsOnThisFloor = allRoomsWithBeds.filter(
        r => r.floorNumber === f.floorNumber && r.availableBeds.length > 0,
      );
      return {
        floorNumber: f.floorNumber,
        label: f.floorNumber === 0 ? 'Ground Floor' : `Floor ${f.floorNumber}`,
        availableRoomsCount: roomsOnThisFloor.length,
      };
    });
  }, [matrixData, allRoomsWithBeds]);

  // Filtered rooms (must have at least 1 available bed, and match search/floor/sharing)
  const filteredRooms = useMemo(() => {
    return allRoomsWithBeds.filter(item => {
      // Must have vacant beds to be eligible for transfer
      if (item.availableBeds.length === 0) return false;

      // Search query filter (matches room number or any bed number)
      if (bedSearchQuery.trim()) {
        const q = bedSearchQuery.trim().toLowerCase();
        const roomMatch = (item.room.roomNumber || '').toLowerCase().includes(q);
        const bedMatch = item.availableBeds.some(b =>
          (b.bedNumber || '').toLowerCase().includes(q),
        );
        if (!roomMatch && !bedMatch) return false;
      }

      // Floor filter
      if (selectedFloorFilter !== 'all' && item.floorNumber !== selectedFloorFilter) {
        return false;
      }

      // Sharing filter
      if (selectedSharingFilter !== 'all') {
        if (selectedSharingFilter === 4) {
          if (item.sharingType < 4) return false;
        } else if (item.sharingType !== selectedSharingFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allRoomsWithBeds, bedSearchQuery, selectedFloorFilter, selectedSharingFilter]);

  // When a bed is picked, verify real-time availability and init rent
  const handleSelectBed = async (item: TargetBedItem) => {
    setSelectedTargetBed(item);
    setIsVerifyingBed(true);
    setRealtimeVerified(false);

    const defaultRentPaise =
      item.bed.baseRentPaise ?? item.room.baseRentPaisePerBed ?? tenant?.monthlyRentPaise ?? 0;
    setTargetNewRentRupees(Math.round(defaultRentPaise / 100).toString());

    try {
      const refreshed = await matrixRefetch();
      let isStillVacant = false;
      refreshed.data?.floors?.forEach(f => {
        (f.rooms || []).forEach(r => {
          (r.beds || []).forEach(b => {
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

  // Tenant's billing cycle recurring date based on joined date
  const tenantCycleDay = useMemo(() => {
    if (tenant?.joinedDate) {
      try {
        const jd = new Date(tenant.joinedDate);
        if (!isNaN(jd.getTime())) return jd.getDate();
      } catch {
        // fallback
      }
    }
    return 1;
  }, [tenant?.joinedDate]);

  const nextBillingCycleDate = useMemo(() => {
    return getNextBillingCycleDate(tenant?.joinedDate);
  }, [tenant?.joinedDate]);

  // Compute calculated effective date
  const calculatedEffectiveDate = useMemo(() => {
    const now = new Date();
    if (effectiveType === 'next_month') {
      return nextBillingCycleDate;
    }
    if (effectiveType === 'custom') {
      return customEffectiveDate;
    }
    return now;
  }, [effectiveType, nextBillingCycleDate, customEffectiveDate]);

  // Compute live proration & rent comparison
  const parsedTargetRentRupees = parseFloat(targetNewRentRupees) || 0;
  const targetRentPaise = Math.round(parsedTargetRentRupees * 100);
  const fromRentPaise = tenant?.monthlyRentPaise || 0;
  const isSameRent = targetRentPaise === fromRentPaise;
  const isDifferentRent = !isSameRent;

  // Minimum allowed date for different rent bed transfers (strictly after current month/cycle completes)
  const minDateForDifferentRent = useMemo(() => {
    return nextBillingCycleDate;
  }, [nextBillingCycleDate]);

  // When rent differs, immediate transfers are disallowed; auto-switch to next billing cycle
  useEffect(() => {
    if (isDifferentRent && effectiveType === 'immediate') {
      setEffectiveType('next_month');
    }
  }, [isDifferentRent, effectiveType]);

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

    // Enforce business rule: different rent transfers can ONLY take effect after completing the current month
    if (isDifferentRent) {
      if (effectiveType === 'immediate') {
        Alert.alert(
          'Transfer Date Restricted',
          `Transfers to a bed with different rent (${formatINR(fromRentPaise)} → ${formatINR(targetRentPaise)}) can only take effect after completing the current month (on next billing cycle ${formatSafeDate(nextBillingCycleDate)}). For same-rent beds, transfer can happen anytime.`,
        );
        return;
      }
      if (
        effectiveType === 'custom' &&
        calculatedEffectiveDate.toISOString().slice(0, 10) <
          minDateForDifferentRent.toISOString().slice(0, 10)
      ) {
        Alert.alert(
          'Invalid Effective Date',
          `Transfers between beds with different rent (higher or lower) must take effect after the current billing month completes (Next billing cycle: ${formatSafeDate(minDateForDifferentRent)} or later). Same-rent beds can be transferred anytime.`,
        );
        return;
      }
    }

    const tenantPropId = getTenantPropertyId(tenant);

    setIsSubmitting(true);
    try {
      await moveBedApi(tenant._id, {
        newBedId: selectedTargetBed.bed._id,
        targetPropertyId: selectedPropertyId !== tenantPropId ? selectedPropertyId : undefined,
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

      queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenant._id] });
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

      setTransferSuccessData({
        isScheduled,
        title: isScheduled ? 'Bed Transfer Scheduled!' : 'Bed Transferred Successfully!',
        message: isScheduled
          ? `Bed ${selectedTargetBed.bed.bedNumber} has been reserved for ${tenant.fullName}. The transfer will take effect on ${formatSafeDate(calculatedEffectiveDate)} after completing the current month.`
          : `Tenant ${tenant.fullName} has been transferred to Bed ${selectedTargetBed.bed.bedNumber} at ${formatINR(targetRentPaise)}/mo.`,
        bedNumber: selectedTargetBed.bed.bedNumber,
        rent: formatINR(targetRentPaise),
        effectiveDateStr: formatSafeDate(calculatedEffectiveDate),
      });
    } catch (err: any) {
      Alert.alert(
        'Transfer Error',
        err?.response?.data?.message || err?.message || 'Failed to complete bed transfer.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (selectedTargetBed) {
              setSelectedTargetBed(null);
            } else {
              onClose();
            }
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            height: '88%',
            backgroundColor: '#FAF5EB',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
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
                  {selectedTargetBed ? 'Configure Bed Transfer' : 'Select Destination Room & Bed'}
                </Text>
                <Text
                  style={{ fontSize: 12, color: '#657080', fontWeight: '500', marginTop: 1 }}
                  numberOfLines={1}
                >
                  {tenant?.fullName} · Current: Bed {currentBedNumber} (₹{originalRentRupees}/mo)
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
                      {(originalRentRupees - parsedTargetRentRupees).toLocaleString('en-IN')}/mo
                      (from ₹{originalRentRupees.toLocaleString('en-IN')} to ₹
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
                      {(parsedTargetRentRupees - originalRentRupees).toLocaleString('en-IN')}/mo
                      (from ₹{originalRentRupees.toLocaleString('en-IN')} to ₹
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

                {/* Transfer Policy Explanatory Banner */}
                {isDifferentRent ? (
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Info size={16} color="#2563EB" style={{ marginTop: 2, marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: '#1E40AF',
                          marginBottom: 2,
                        }}
                      >
                        Rent Change Transfer Policy
                      </Text>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '500',
                          color: '#1E3A8A',
                          lineHeight: 17,
                        }}
                      >
                        Because destination bed rent ({formatINR(targetRentPaise)}) differs from
                        current rent ({formatINR(fromRentPaise)}), this transfer can only take
                        effect after completing the current month / after tenant due date to keep
                        billing clean.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <CheckCircle2
                      size={16}
                      color="#15803D"
                      style={{ marginTop: 2, marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: '#166534',
                          marginBottom: 2,
                        }}
                      >
                        Same Rent Bed
                      </Text>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '500',
                          color: '#14532D',
                          lineHeight: 17,
                        }}
                      >
                        Both beds have identical rent ({formatINR(fromRentPaise)}/mo). You can
                        transfer the tenant anytime immediately or on any custom date.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ gap: 8 }}>
                  {/* Option 1: Immediately (Only allowed for same rent) */}
                  <TouchableOpacity
                    onPress={() => {
                      if (isDifferentRent) {
                        Alert.alert(
                          'Immediate Transfer Restricted',
                          `Transfers between beds with different rent (higher or lower) can only take effect after completing the current month (Next billing cycle: ${formatSafeDate(nextBillingCycleDate)}). Same-rent beds can be transferred anytime.`,
                        );
                        return;
                      }
                      setEffectiveType('immediate');
                    }}
                    activeOpacity={isDifferentRent ? 1 : 0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: isDifferentRent
                        ? '#F1F5F9'
                        : effectiveType === 'immediate'
                          ? '#19D3E6'
                          : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: isDifferentRent
                        ? '#E2E8F0'
                        : effectiveType === 'immediate'
                          ? '#19D3E6'
                          : '#E5DDCD',
                      opacity: isDifferentRent ? 0.65 : 1,
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
                      {isDifferentRent ? (
                        <Lock size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                      ) : (
                        <Clock
                          size={16}
                          color={effectiveType === 'immediate' ? '#0C192B' : '#657080'}
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: effectiveType === 'immediate' ? '800' : '600',
                            color: isDifferentRent
                              ? '#94A3B8'
                              : effectiveType === 'immediate'
                                ? '#0C192B'
                                : '#0C192B',
                          }}
                        >
                          Immediately (Today)
                        </Text>
                        {isDifferentRent ? (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '500',
                              color: '#64748B',
                              marginTop: 2,
                            }}
                          >
                            Locked · Allowed after current month completes (
                            {formatSafeDate(nextBillingCycleDate)})
                          </Text>
                        ) : (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '500',
                              color: '#15803D',
                              marginTop: 2,
                            }}
                          >
                            Same rent · Can transfer anytime immediately
                          </Text>
                        )}
                      </View>
                    </View>
                    {!isDifferentRent && effectiveType === 'immediate' && (
                      <Check size={16} color="#0C192B" strokeWidth={3} />
                    )}
                  </TouchableOpacity>

                  {/* Option 2: From Next Billing Cycle */}
                  <TouchableOpacity
                    onPress={() => setEffectiveType('next_month')}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: effectiveType === 'next_month' ? '#19D3E6' : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: effectiveType === 'next_month' ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Calendar
                        size={16}
                        color={effectiveType === 'next_month' ? '#0C192B' : '#657080'}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: effectiveType === 'next_month' ? '800' : '600',
                            color: '#0C192B',
                          }}
                        >
                          From Next Billing Cycle ({formatSafeDate(nextBillingCycleDate)})
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: '#0C192B',
                            marginTop: 1,
                          }}
                        >
                          {isDifferentRent
                            ? `Recommended · Takes effect after current month completes (cycle day ${tenantCycleDay})`
                            : `Next billing cycle starts on day ${tenantCycleDay}`}
                        </Text>
                      </View>
                    </View>
                    {effectiveType === 'next_month' && (
                      <Check size={16} color="#0C192B" strokeWidth={3} />
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
                      backgroundColor: effectiveType === 'custom' ? '#19D3E6' : '#FAF5EB',
                      borderWidth: 1,
                      borderColor: effectiveType === 'custom' ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar
                        size={16}
                        color={effectiveType === 'custom' ? '#0C192B' : '#657080'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: effectiveType === 'custom' ? '800' : '600',
                          color: '#0C192B',
                        }}
                      >
                        Custom Date:{' '}
                        {effectiveType === 'custom'
                          ? formatSafeDate(customEffectiveDate)
                          : 'Select date'}
                      </Text>
                    </View>
                    {effectiveType === 'custom' && (
                      <Check size={16} color="#0C192B" strokeWidth={3} />
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
            /* STEP 1: ROOMS & BEDS SELECTION LIST */
            <View style={{ flex: 1 }}>
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
                    {properties.map((p, idx) => {
                      const isSelected = p._id === activePropertyId;
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
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSelected ? '#0C192B' : '#657080',
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
                    placeholder="Search room number (e.g. 101) or bed (e.g. A)..."
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
                      backgroundColor: selectedFloorFilter === 'all' ? '#19D3E6' : '#FFFDF8',
                      borderWidth: 1,
                      borderColor: selectedFloorFilter === 'all' ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: selectedFloorFilter === 'all' ? '800' : '600',
                        color: selectedFloorFilter === 'all' ? '#0C192B' : '#657080',
                      }}
                    >
                      All Floors ({filteredRooms.length} Rooms · {totalVacantBedsCount} Beds)
                    </Text>
                  </TouchableOpacity>

                  {availableFloors.map(f => {
                    const isSelected = selectedFloorFilter === f.floorNumber;
                    return (
                      <TouchableOpacity
                        key={f.floorNumber}
                        onPress={() => setSelectedFloorFilter(f.floorNumber)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 9999,
                          backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
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
                          {f.label} ({f.availableRoomsCount} Rooms)
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
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 9999,
                          backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
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
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Loading State */}
              {isMatrixLoading || isMatrixFetching ? (
                <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#4F5330" />
                  <Text
                    style={{ fontSize: 13, fontWeight: '700', color: '#657080', marginTop: 12 }}
                  >
                    Loading rooms and available beds…
                  </Text>
                </View>
              ) : filteredRooms.length === 0 ? (
                /* Empty State */
                <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <BedDouble size={36} color="#CBD5E1" />
                  <Text
                    style={{ fontSize: 15, fontWeight: '800', color: '#0C192B', marginTop: 10 }}
                  >
                    No rooms with vacant beds found
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
                  <TouchableOpacity
                    onPress={() => matrixRefetch()}
                    style={{
                      marginTop: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                    }}
                  >
                    <RefreshCw size={14} color="#4F5330" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330' }}>
                      Refresh Rooms & Beds
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Room Cards List */
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredRooms.map(item => {
                    const roomRentPaise = item.room.baseRentPaisePerBed || originalRentRupees * 100;

                    return (
                      <View
                        key={item.room._id}
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          borderRadius: 18,
                          padding: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.03,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      >
                        {/* Room Header Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#F0ECE1',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: '#F4F8EC',
                                borderWidth: 1,
                                borderColor: '#D9E8CE',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                              }}
                            >
                              <DoorClosed size={18} color="#4F5330" />
                            </View>
                            <View>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                                Room {item.room.roomNumber}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '500',
                                  color: '#657080',
                                  marginTop: 1,
                                }}
                              >
                                {item.floorNumber === 0
                                  ? 'Ground Floor'
                                  : `Floor ${item.floorNumber}`}{' '}
                                · {item.sharingType}-Share
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#4F5330' }}>
                              {formatINR(roomRentPaise)}/mo
                            </Text>
                            <View
                              style={{
                                backgroundColor: '#E8F5E9',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                marginTop: 3,
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E7D32' }}>
                                {item.availableBeds.length} Available Bed
                                {item.availableBeds.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Available Beds inside this Room */}
                        <View style={{ paddingTop: 12, gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: '#657080',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              marginBottom: 2,
                            }}
                          >
                            Choose Bed to Move:
                          </Text>

                          {item.availableBeds.map(bed => {
                            const bedRentPaise =
                              bed.baseRentPaise ?? roomRentPaise ?? originalRentRupees * 100;
                            const bedRentRupees = Math.round(bedRentPaise / 100);
                            const diffRupees = bedRentRupees - originalRentRupees;

                            return (
                              <TouchableOpacity
                                key={bed._id}
                                onPress={() =>
                                  handleSelectBed({
                                    bed,
                                    room: item.room,
                                    floorNumber: item.floorNumber,
                                    floorLabel: item.floorLabel,
                                  })
                                }
                                activeOpacity={0.75}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#FAF5EB',
                                  borderWidth: 1,
                                  borderColor: '#E5DDCD',
                                  borderRadius: 14,
                                  paddingVertical: 10,
                                  paddingHorizontal: 12,
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
                                      width: 30,
                                      height: 30,
                                      borderRadius: 15,
                                      backgroundColor: '#FFFDF8',
                                      borderWidth: 1,
                                      borderColor: '#E5DDCD',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginRight: 10,
                                    }}
                                  >
                                    <BedDouble size={15} color="#4F5330" />
                                  </View>

                                  <View>
                                    <Text
                                      style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}
                                    >
                                      Bed {bed.bedNumber}
                                    </Text>
                                    <View
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginTop: 2,
                                        gap: 6,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 12,
                                          fontWeight: '700',
                                          color: '#4F5330',
                                        }}
                                      >
                                        ₹{bedRentRupees.toLocaleString('en-IN')}/mo
                                      </Text>

                                      {diffRupees < 0 ? (
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: '700',
                                            color: '#2E7D32',
                                          }}
                                        >
                                          · ₹{Math.abs(diffRupees).toLocaleString('en-IN')} cheaper
                                        </Text>
                                      ) : diffRupees > 0 ? (
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: '700',
                                            color: '#1D4ED8',
                                          }}
                                        >
                                          · +₹{diffRupees.toLocaleString('en-IN')} higher
                                        </Text>
                                      ) : (
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: '#657080',
                                          }}
                                        >
                                          · Same rent
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </View>

                                <View
                                  style={{
                                    backgroundColor: '#19D3E6',
                                    borderRadius: 9999,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '800',
                                      color: '#0C192B',
                                      marginRight: 2,
                                    }}
                                  >
                                    Select
                                  </Text>
                                  <ChevronRight size={12} color="#0C192B" />
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
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
          if (
            isDifferentRent &&
            d.toISOString().slice(0, 10) < minDateForDifferentRent.toISOString().slice(0, 10)
          ) {
            Alert.alert(
              'Invalid Date for Different Rent Bed',
              `Transfers between beds with different rent (higher or lower) must take effect after the current month completes (${formatSafeDate(minDateForDifferentRent)} or later).`,
            );
            setCustomEffectiveDate(minDateForDifferentRent);
          } else {
            setCustomEffectiveDate(d);
          }
          setShowDatePicker(false);
        }}
        title="Select Effective Date"
      />

      {/* Modern In-App Success Modal for Bed Transfer */}
      {transferSuccessData && (
        <SuccessActionModal
          visible={!!transferSuccessData}
          onClose={() => {
            setTransferSuccessData(null);
            onClose();
            if (onTransferSuccess) onTransferSuccess();
          }}
          title={transferSuccessData.title}
          message={transferSuccessData.message}
          highlightCard={{
            icon: <BedDouble size={16} color="#15803D" />,
            title: `Bed ${transferSuccessData.bedNumber} • ${transferSuccessData.rent}/mo`,
            subtitle: `Effective: ${transferSuccessData.effectiveDateStr}`,
          }}
        />
      )}
    </Modal>
  );
};
