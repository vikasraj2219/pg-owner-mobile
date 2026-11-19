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
} from 'react-native';
import { X, Zap, Edit2, Trash2, Building2, DoorClosed } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { formatSafeDate } from '../utils/date';
import {
  recordMeterReadingApi,
  getMeterReadingsApi,
  getLatestRoomReadingApi,
  updateMeterReadingApi,
  deleteMeterReadingApi,
} from '../api/meters';
import { fetchPropertyRooms } from '../api/properties';
import { IMeterReading, IRoom, IProperty } from '../types/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SubMeterModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
  properties?: IProperty[];
}

export const SubMeterModal: React.FC<SubMeterModalProps> = ({
  visible,
  onClose,
  property,
  properties = [],
}) => {
  const queryClient = useQueryClient();
  const [activePropertyId, setActivePropertyId] = useState<string | null>(property?._id || null);

  useEffect(() => {
    if (visible) {
      const initialId = property?._id || (properties.length > 0 ? properties[0]._id : null);
      setActivePropertyId(initialId);
    }
  }, [visible, property, properties]);

  const activeProperty = useMemo(() => {
    if (!activePropertyId) return property;
    return properties.find(p => p._id === activePropertyId) || property;
  }, [activePropertyId, properties, property]);

  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [readings, setReadings] = useState<IMeterReading[]>([]);
  const [historyRoomFilter, setHistoryRoomFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [previousReading, setPreviousReading] = useState('0');
  const [currentReading, setCurrentReading] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('0');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'by_days_occupied'>('equal');

  // Edit Reading State
  const [editingReading, setEditingReading] = useState<IMeterReading | null>(null);
  const [editPrevReading, setEditPrevReading] = useState('');
  const [editCurrReading, setEditCurrReading] = useState('');
  const [editRate, setEditRate] = useState('0');
  const [editSplitMethod, setEditSplitMethod] = useState<'equal' | 'by_days_occupied'>('equal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingReading, setDeletingReading] = useState<IMeterReading | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRoomsAndReadings = useCallback(async () => {
    if (!activeProperty?._id) return;
    setIsLoading(true);
    try {
      const [roomsData, readingsData] = await Promise.all([
        fetchPropertyRooms(activeProperty._id),
        getMeterReadingsApi(activeProperty._id),
      ]);
      setRooms(roomsData);
      setReadings(readingsData);
      if (roomsData.length > 0 && !selectedRoom) {
        setSelectedRoom(roomsData[0]);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeProperty?._id, selectedRoom]);

  useEffect(() => {
    if (visible && activeProperty?._id) {
      loadRoomsAndReadings();
      if (activeProperty.electricityRatePaisePerUnit) {
        setRatePerUnit((activeProperty.electricityRatePaisePerUnit / 100).toString());
      }
    }
  }, [visible, activeProperty, loadRoomsAndReadings]);

  // When room selection changes, load latest reading
  useEffect(() => {
    async function fetchLatest() {
      if (!selectedRoom?._id) return;
      try {
        const latest = await getLatestRoomReadingApi(selectedRoom._id);
        if (latest) {
          setPreviousReading(latest.currentReading.toString());
        } else {
          setPreviousReading('0');
        }
      } catch {
        setPreviousReading('0');
      }
    }
    fetchLatest();
  }, [selectedRoom]);

  const prevNum = parseFloat(previousReading) || 0;
  const currNum = parseFloat(currentReading) || 0;
  const rateNum = isNaN(parseFloat(ratePerUnit)) ? 0 : parseFloat(ratePerUnit);

  const unitsConsumed = Math.max(0, currNum - prevNum);
  const totalAmountPaise = Math.round(unitsConsumed * rateNum * 100);

  const handleRecordReading = async () => {
    if (!activeProperty?._id || !selectedRoom?._id) return;

    if (currNum < prevNum) {
      Alert.alert(
        'Invalid Reading',
        `Current reading (${currNum}) cannot be lower than previous reading (${prevNum}).`,
      );
      return;
    }

    if (unitsConsumed === 0) {
      Alert.alert('Zero Units', 'Current reading is identical to previous reading.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ratePaise = Math.round(rateNum * 100);
      await recordMeterReadingApi({
        propertyId: activeProperty._id,
        roomId: selectedRoom._id,
        meterIdentifier: `Room ${selectedRoom.roomNumber} Sub-meter`,
        previousReading: prevNum,
        currentReading: currNum,
        ratePaisePerUnit: ratePaise,
        splitMethod,
      });

      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert(
        'Reading Recorded',
        `Room ${selectedRoom.roomNumber}: ${unitsConsumed} units (${formatINR(totalAmountPaise)}) split recorded.`,
      );
      setCurrentReading('');
      loadRoomsAndReadings();
    } catch {
      Alert.alert('Error', 'Failed to record meter reading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (reading: IMeterReading) => {
    setEditingReading(reading);
    setEditPrevReading(reading.previousReading.toString());
    setEditCurrReading(reading.currentReading.toString());
    setEditRate((reading.ratePaisePerUnit / 100).toString());
    setEditSplitMethod(reading.splitMethod || 'equal');
  };

  const editPNum = parseFloat(editPrevReading) || 0;
  const editCNum = parseFloat(editCurrReading) || 0;
  const editRNum = isNaN(parseFloat(editRate)) ? 0 : parseFloat(editRate);
  const editUnitsConsumed = Math.max(0, editCNum - editPNum);
  const editTotalAmountPaise = Math.round(editUnitsConsumed * editRNum * 100);

  const handleSaveEdit = async () => {
    if (!editingReading) return;

    if (editCNum < editPNum) {
      Alert.alert(
        'Invalid Reading',
        `Current dial (${editCNum}) cannot be lower than previous dial (${editPNum}).`,
      );
      return;
    }

    setIsUpdating(true);
    try {
      await updateMeterReadingApi(editingReading._id, {
        previousReading: editPNum,
        currentReading: editCNum,
        ratePaisePerUnit: Math.round(editRNum * 100),
        splitMethod: editSplitMethod,
      });

      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert('Updated', 'Sub-meter reading corrected and bill splits recalculated.');
      setEditingReading(null);
      loadRoomsAndReadings();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update meter reading';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteReading = (reading: IMeterReading) => {
    setDeletingReading(reading);
  };

  const handleConfirmDeleteReading = async () => {
    if (!deletingReading) return;
    setIsDeleting(true);
    try {
      await deleteMeterReadingApi(deletingReading._id);
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingReading(null);
      loadRoomsAndReadings();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete meter reading';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered past readings based on history filter
  const filteredReadings = useMemo(() => {
    if (historyRoomFilter === 'all') return readings;
    return readings.filter(r => {
      const ident = (r.meterIdentifier || '').toLowerCase();
      return ident.includes(`room ${historyRoomFilter.toLowerCase()}`);
    });
  }, [readings, historyRoomFilter]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* Header */}
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
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
              Sub-meter Electricity Log
            </Text>
            <Text
              style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}
              numberOfLines={1}
            >
              {activeProperty?.name || 'Property'} · EB Split Calculator
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
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

        {/* Property Selector Bar (if owner has multiple properties) */}
        {properties.length > 1 && (
          <View
            style={{
              backgroundColor: '#FAF5EB',
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DDCD',
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
              Select Property
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
            >
              {properties.map(p => {
                const isSelected = activePropertyId === p._id;
                return (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => {
                      setActivePropertyId(p._id);
                      setSelectedRoom(null);
                    }}
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
                    <Building2
                      size={13}
                      color={isSelected ? '#0C192B' : '#657080'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '600',
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

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#4F5330" />
            <Text style={{ color: '#657080', fontSize: 13, fontWeight: '600', marginTop: 12 }}>
              Loading meter records…
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Room Selector Filter */}
            <View style={{ marginBottom: 14 }}>
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
                Select Room for Reading
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {rooms.map(room => {
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <TouchableOpacity
                      key={room._id}
                      onPress={() => setSelectedRoom(room)}
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
                      <DoorClosed
                        size={13}
                        color={isSelected ? '#0C192B' : '#657080'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                        }}
                      >
                        Room {room.roomNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Reading Input Card */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5DDCD',
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
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                  Log New Dial Reading · Room {selectedRoom?.roomNumber || '—'}
                </Text>
                {selectedRoom && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 9999,
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F5330' }}>
                      {selectedRoom.sharingType} Bed Room
                    </Text>
                  </View>
                )}
              </View>

              {/* Dials input */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Previous Dial
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: '#0C192B',
                      backgroundColor: '#FAF5EB',
                      fontWeight: '700',
                      fontSize: 14,
                    }}
                    keyboardType="numeric"
                    value={previousReading}
                    onChangeText={setPreviousReading}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#4F5330',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Current Dial *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#4F5330',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: '#0C192B',
                      backgroundColor: '#FFFDF8',
                      fontWeight: '800',
                      fontSize: 15,
                    }}
                    placeholder="e.g. 1520"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={currentReading}
                    onChangeText={setCurrentReading}
                  />
                </View>
              </View>

              {/* Rate per unit & Split method */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Rate / Unit (₹)
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: '#0C192B',
                      backgroundColor: '#FFFDF8',
                      fontWeight: '700',
                      fontSize: 14,
                    }}
                    keyboardType="numeric"
                    value={ratePerUnit}
                    onChangeText={setRatePerUnit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Split Method
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setSplitMethod(prev => (prev === 'equal' ? 'by_days_occupied' : 'equal'))
                    }
                    activeOpacity={0.7}
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: '#FAF5EB',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                      {splitMethod === 'equal' ? 'Equal Split' : 'By Days Stayed'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calculated units & amount banner */}
              <View
                style={{
                  backgroundColor: '#E0F7FA',
                  borderWidth: 1,
                  borderColor: '#80DEEA',
                  padding: 14,
                  borderRadius: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#00838F' }}>
                    {unitsConsumed} Units Consumed
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', marginTop: 2 }}>
                    {formatINR(totalAmountPaise)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#B2EBF2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={20} color="#00838F" />
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting || unitsConsumed === 0}
                onPress={handleRecordReading}
                style={{
                  borderRadius: 9999,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: unitsConsumed > 0 ? '#4F5330' : '#CBD5E1',
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
                    Record & Split Bill
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* History of Past Readings */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
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
                Past Meter Readings ({filteredReadings.length})
              </Text>
            </View>

            {/* Past Readings Room Filter Pills */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
              >
                <TouchableOpacity
                  onPress={() => setHistoryRoomFilter('all')}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 9999,
                    backgroundColor: historyRoomFilter === 'all' ? '#19D3E6' : '#FFFDF8',
                    borderWidth: 1,
                    borderColor: historyRoomFilter === 'all' ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: historyRoomFilter === 'all' ? '800' : '600',
                      color: historyRoomFilter === 'all' ? '#0C192B' : '#657080',
                    }}
                  >
                    All Rooms
                  </Text>
                </TouchableOpacity>

                {rooms.map(room => {
                  const isSelected = historyRoomFilter === room.roomNumber;
                  return (
                    <TouchableOpacity
                      key={`hist-${room._id}`}
                      onPress={() => setHistoryRoomFilter(room.roomNumber)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 9999,
                        backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                        borderWidth: 1,
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                        }}
                      >
                        Room {room.roomNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {filteredReadings.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 20,
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
                  No meter readings recorded yet.
                </Text>
              </View>
            ) : (
              filteredReadings.map(reading => (
                <View
                  key={reading._id}
                  style={{
                    backgroundColor: '#FFFDF8',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    marginBottom: 12,
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
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                        {reading.meterIdentifier || 'Sub-meter'}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                      >
                        {formatSafeDate(reading.readingDate)} · {reading.unitsConsumed} Units (
                        {reading.previousReading} → {reading.currentReading}) @ ₹
                        {(reading.ratePaisePerUnit / 100).toFixed(0)}/u
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                      {formatINR(reading.totalAmountPaise)}
                    </Text>
                  </View>

                  {/* Tenant Splits */}
                  {reading.tenantSplits && reading.tenantSplits.length > 0 && (
                    <View
                      style={{
                        backgroundColor: '#FAF5EB',
                        borderRadius: 14,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        marginVertical: 8,
                      }}
                    >
                      {reading.tenantSplits.map((split, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: '#657080', fontWeight: '600' }}>
                            {typeof split.tenant === 'object' && split.tenant?.fullName
                              ? split.tenant.fullName
                              : `Tenant ${i + 1}`}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
                            {formatINR(split.sharePaise)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions: Edit & Delete */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      gap: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#FAF5EB',
                      marginTop: 4,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(reading)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 9999,
                        backgroundColor: '#FAF5EB',
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                      }}
                    >
                      <Edit2 size={13} color="#4F5330" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#4F5330',
                          marginLeft: 6,
                        }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteReading(reading)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 9999,
                        backgroundColor: '#FFF1F2',
                        borderWidth: 1,
                        borderColor: '#FECDD3',
                      }}
                    >
                      <Trash2 size={13} color="#BE123C" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#BE123C',
                          marginLeft: 6,
                        }}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Edit Reading Modal */}
        {editingReading && (
          <Modal
            visible={!!editingReading}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingReading(null)}
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
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}>
                    Edit Meter Reading
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingReading(null)}
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

                <Text
                  style={{ fontSize: 12, color: '#657080', fontWeight: '600', marginBottom: 14 }}
                >
                  {editingReading.meterIdentifier || 'Sub-meter'}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#657080',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Previous Dial
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: '#0C192B',
                        backgroundColor: '#FFFDF8',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                      keyboardType="numeric"
                      value={editPrevReading}
                      onChangeText={setEditPrevReading}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#4F5330',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Current Dial *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1.5,
                        borderColor: '#4F5330',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: '#0C192B',
                        backgroundColor: '#FFFDF8',
                        fontWeight: '800',
                        fontSize: 14,
                      }}
                      keyboardType="numeric"
                      value={editCurrReading}
                      onChangeText={setEditCurrReading}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#657080',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Rate / Unit (₹)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: '#0C192B',
                        backgroundColor: '#FFFDF8',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                      keyboardType="numeric"
                      value={editRate}
                      onChangeText={setEditRate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#657080',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Split Method
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setEditSplitMethod(prev =>
                          prev === 'equal' ? 'by_days_occupied' : 'equal',
                        )
                      }
                      activeOpacity={0.7}
                      style={{
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: '#FFFDF8',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>
                        {editSplitMethod === 'equal' ? 'Equal' : 'By Days'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Live Preview */}
                <View
                  style={{
                    backgroundColor: '#E0F7FA',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#80DEEA',
                    marginBottom: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#00838F' }}>
                      {editUnitsConsumed} Units Consumed
                    </Text>
                    <Text
                      style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginTop: 2 }}
                    >
                      {formatINR(editTotalAmountPaise)}
                    </Text>
                  </View>
                  <Zap size={20} color="#00838F" />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setEditingReading(null)}
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
          visible={Boolean(deletingReading)}
          onClose={() => setDeletingReading(null)}
          onConfirm={handleConfirmDeleteReading}
          isLoading={isDeleting}
          title="Delete Reading?"
          message={`Are you sure you want to delete this reading for ${deletingReading?.meterIdentifier || 'Sub-meter'} (${deletingReading?.unitsConsumed} units, ${formatINR(deletingReading?.totalAmountPaise || 0)})? This will remove tenant bill splits.`}
          confirmLabel="Delete"
        />
      </View>
    </Modal>
  );
};
