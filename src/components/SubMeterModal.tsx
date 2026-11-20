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
  Zap,
  Edit2,
  Trash2,
  DoorClosed,
  ArrowLeft,
  Filter,
  Search,
  Layers,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { getPropertyImage } from '../utils/assetImages';
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
  initialTab?: 'logs' | 'add';
}

export const SubMeterModal: React.FC<SubMeterModalProps> = ({
  visible,
  onClose,
  property,
  properties = [],
  initialTab = 'logs',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'logs' | 'add'>(initialTab);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(property?._id || null);

  useEffect(() => {
    if (visible) {
      const initialId = property?._id || (properties.length > 0 ? properties[0]._id : null);
      setActivePropertyId(initialId);
      setActiveTab(initialTab || 'logs');
    }
  }, [visible, property, properties, initialTab]);

  const activeProperty = useMemo(() => {
    if (!activePropertyId) return property;
    return properties.find(p => p._id === activePropertyId) || property;
  }, [activePropertyId, properties, property]);

  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');

  useEffect(() => {
    setSelectedRoom(null);
    setSelectedFloor('all');
    setSearchQuery('');
  }, [activePropertyId]);

  const [readings, setReadings] = useState<IMeterReading[]>([]);
  const [historyRoomFilter, setHistoryRoomFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const floorsList = useMemo(() => {
    const distinct = Array.from(new Set(rooms.map(r => r.floorNumber))).sort((a, b) => a - b);
    return distinct;
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesFloor = selectedFloor === 'all' || r.floorNumber === selectedFloor;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || r.roomNumber.toLowerCase().includes(q);
      return matchesFloor && matchesSearch;
    });
  }, [rooms, selectedFloor, searchQuery]);

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
      await loadRoomsAndReadings();
      setActiveTab('logs');
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

      Alert.alert('Updated', 'Meter reading updated successfully.');
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

  // Filtered past readings based on history filter, floor, and search query
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const ident = (r.meterIdentifier || '').toLowerCase();
      if (historyRoomFilter !== 'all') {
        if (!ident.includes(`room ${historyRoomFilter.toLowerCase()}`)) return false;
      }
      if (selectedFloor !== 'all') {
        const roomsOnFloor = rooms
          .filter(rm => rm.floorNumber === selectedFloor)
          .map(rm => rm.roomNumber.toLowerCase());
        const matchesFloor = roomsOnFloor.some(rn => ident.includes(`room ${rn}`));
        if (!matchesFloor) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesIdent = ident.includes(q);
        const matchesPrev = String(r.previousReading ?? '').includes(q);
        const matchesCurr = String(r.currentReading ?? '').includes(q);
        if (!matchesIdent && !matchesPrev && !matchesCurr) return false;
      }
      return true;
    });
  }, [readings, historyRoomFilter, selectedFloor, rooms, searchQuery]);

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
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={onClose}
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
              {activeTab === 'logs' ? 'Sub-meter Electricity Logs' : 'Log Sub-meter Reading'}
            </Text>
            <Text
              style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}
              numberOfLines={1}
            >
              {activeTab === 'logs'
                ? `${activeProperty?.name || 'Property'} · Readings & consumption history`
                : `${activeProperty?.name || 'Property'} · EB Split Calculator`}
            </Text>
          </View>
        </View>

        {/* Top Segmented Tabs (Electricity Logs vs Log New Reading) */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 12,
            gap: 10,
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('logs')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 11,
              borderRadius: 9999,
              backgroundColor: activeTab === 'logs' ? '#4F5330' : '#FFFDF8',
              borderWidth: 1,
              borderColor: activeTab === 'logs' ? '#4F5330' : '#E5DDCD',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'logs' ? 0.08 : 0.02,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Zap
              size={15}
              color={activeTab === 'logs' ? '#FFFFFF' : '#0C192B'}
              strokeWidth={2.3}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: activeTab === 'logs' ? '#FFFFFF' : '#0C192B',
              }}
            >
              Electricity Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('add')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 11,
              borderRadius: 9999,
              backgroundColor: activeTab === 'add' ? '#4F5330' : '#FFFDF8',
              borderWidth: 1,
              borderColor: activeTab === 'add' ? '#4F5330' : '#E5DDCD',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'add' ? 0.08 : 0.02,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Plus
              size={15}
              color={activeTab === 'add' ? '#FFFFFF' : '#0C192B'}
              strokeWidth={2.5}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: activeTab === 'add' ? '#FFFFFF' : '#0C192B',
              }}
            >
              Log Reading
            </Text>
          </TouchableOpacity>
        </View>

        {/* Property Selector Bar */}
        {(properties.length > 0 || property) && (
          <View
            style={{
              backgroundColor: '#FAF5EB',
              paddingHorizontal: 20,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DDCD',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Filter size={13} color="#0C192B" strokeWidth={2.2} style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                Filter by Property
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {(properties.length > 0 ? properties : property ? [property] : []).map((p, idx) => {
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 26 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================================================= */}
          {/* TAB 1: ELECTRICITY LOGS (VIEW PAST READINGS & CONSUMPTION)                */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <View>
              {/* Search Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  marginBottom: 14,
                }}
              >
                <Search size={16} color="#657080" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by room number or dial reading..."
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: '#0C192B',
                    padding: 0,
                    fontWeight: '500',
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#657080' }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Floor Filter Chips */}
              {floorsList.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Layers
                      size={13}
                      color="#0C192B"
                      strokeWidth={2.2}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: '#0C192B',
                      }}
                    >
                      Filter by Floor
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedFloor('all')}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 7,
                        borderRadius: 9999,
                        borderWidth: 1,
                        backgroundColor: selectedFloor === 'all' ? '#19D3E6' : '#FFFDF8',
                        borderColor: selectedFloor === 'all' ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: selectedFloor === 'all' ? '800' : '600',
                          color: selectedFloor === 'all' ? '#0C192B' : '#657080',
                        }}
                      >
                        All Floors ({rooms.length} rooms)
                      </Text>
                    </TouchableOpacity>

                    {floorsList.map(floor => {
                      const isActive = selectedFloor === floor;
                      const floorRoomCount = rooms.filter(r => r.floorNumber === floor).length;
                      return (
                        <TouchableOpacity
                          key={`submeter-flr-${floor}`}
                          activeOpacity={0.8}
                          onPress={() => setSelectedFloor(floor)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 7,
                            borderRadius: 9999,
                            borderWidth: 1,
                            backgroundColor: isActive ? '#19D3E6' : '#FFFDF8',
                            borderColor: isActive ? '#19D3E6' : '#E5DDCD',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isActive ? '800' : '600',
                              color: isActive ? '#0C192B' : '#657080',
                            }}
                          >
                            Floor {floor === 0 ? 'Ground' : floor} ({floorRoomCount} rooms)
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Action row above history */}
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
                <TouchableOpacity
                  onPress={() => setActiveTab('add')}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FAF5EB',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Plus size={13} color="#4F5330" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F5330' }}>
                    + Record Reading
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Past Readings Room Filter Pills */}
              <View style={{ marginBottom: 14 }}>
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

                  {(filteredRooms.length > 0 ? filteredRooms : rooms).map(room => {
                    const isSelected = historyRoomFilter === room.roomNumber;
                    return (
                      <TouchableOpacity
                        key={`hist-${room._id}`}
                        onPress={() => setHistoryRoomFilter(isSelected ? 'all' : room.roomNumber)}
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

              {/* Readings List */}
              {isLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#4F5330" />
                  <Text style={{ fontSize: 13, color: '#657080', marginTop: 10 }}>
                    Loading electricity logs...
                  </Text>
                </View>
              ) : filteredReadings.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 20,
                    padding: 28,
                    alignItems: 'center',
                    marginVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Zap size={26} color="#657080" />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#0C192B',
                      marginBottom: 6,
                      textAlign: 'center',
                    }}
                  >
                    No Electricity Logs Found
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#657080',
                      textAlign: 'center',
                      lineHeight: 18,
                      marginBottom: 18,
                    }}
                  >
                    {searchQuery.trim() || historyRoomFilter !== 'all' || selectedFloor !== 'all'
                      ? 'No readings match your search or filter criteria.'
                      : 'Record room dial readings to calculate consumption and split EB bills among tenants.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setActiveTab('add')}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#4F5330',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 9999,
                    }}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      Log New Dial Reading
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredReadings.map(reading => (
                  <View
                    key={reading._id}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderRadius: 18,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      marginBottom: 10,
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
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Zap size={14} color="#00838F" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                          {reading.meterIdentifier}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#00838F' }}>
                        {formatINR(reading.totalAmountPaise)}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 12, color: '#657080', marginBottom: 8 }}>
                      {reading.unitsConsumed} Units · Dial {reading.previousReading} →{' '}
                      {reading.currentReading} (₹{(reading.ratePaisePerUnit / 100).toFixed(1)}/u)
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: '#FAF5EB',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar size={11} color="#657080" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                          {formatSafeDate(reading.readingDate)} · Split{' '}
                          {reading.splitMethod === 'equal' ? 'Equal' : 'By Days'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <TouchableOpacity
                          onPress={() => handleOpenEdit(reading)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={15} color="#4F5330" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteReading(reading)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color="#BE123C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LOG NEW READING (FORM TO RECORD DIAL & SPLIT BILL)                 */}
          {/* ========================================================================= */}
          {activeTab === 'add' && (
            <View>
              {/* Floor Filter Chips */}
              {floorsList.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Layers
                      size={13}
                      color="#0C192B"
                      strokeWidth={2.2}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: '#0C192B',
                      }}
                    >
                      Filter by Floor
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedFloor('all')}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 7,
                        borderRadius: 9999,
                        borderWidth: 1,
                        backgroundColor: selectedFloor === 'all' ? '#19D3E6' : '#FFFDF8',
                        borderColor: selectedFloor === 'all' ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: selectedFloor === 'all' ? '800' : '600',
                          color: selectedFloor === 'all' ? '#0C192B' : '#657080',
                        }}
                      >
                        All Floors ({rooms.length} rooms)
                      </Text>
                    </TouchableOpacity>

                    {floorsList.map(floor => {
                      const isActive = selectedFloor === floor;
                      const floorRoomCount = rooms.filter(r => r.floorNumber === floor).length;
                      return (
                        <TouchableOpacity
                          key={`add-submeter-flr-${floor}`}
                          activeOpacity={0.8}
                          onPress={() => setSelectedFloor(floor)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 7,
                            borderRadius: 9999,
                            borderWidth: 1,
                            backgroundColor: isActive ? '#19D3E6' : '#FFFDF8',
                            borderColor: isActive ? '#19D3E6' : '#E5DDCD',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isActive ? '800' : '600',
                              color: isActive ? '#0C192B' : '#657080',
                            }}
                          >
                            Floor {floor === 0 ? 'Ground' : floor} ({floorRoomCount} rooms)
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Room Selector Filter */}
              <View style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <DoorClosed
                    size={13}
                    color="#0C192B"
                    strokeWidth={2.2}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: '#0C192B',
                    }}
                  >
                    Select Room for Reading{' '}
                    {selectedRoom ? `(Room ${selectedRoom.roomNumber} selected)` : ''}
                  </Text>
                </View>

                {filteredRooms.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#657080',
                      fontStyle: 'italic',
                      paddingVertical: 6,
                    }}
                  >
                    No rooms match the selected floor or search query.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  >
                    {filteredRooms.map(room => {
                      const isSelected = selectedRoom?._id === room._id;
                      return (
                        <TouchableOpacity
                          key={room._id}
                          onPress={() => setSelectedRoom(isSelected ? null : room)}
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
                )}
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
                    Dial Reading · Room {selectedRoom?.roomNumber || '—'}
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
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: '#0C192B',
                        marginTop: 2,
                      }}
                    >
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
            </View>
          )}
        </ScrollView>

        {/* Edit Reading Modal */}
        {editingReading && (
          <Modal visible={Boolean(editingReading)} transparent animationType="fade">
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                padding: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: '#0C192B',
                    marginBottom: 4,
                  }}
                >
                  Edit Meter Reading
                </Text>
                <Text style={{ fontSize: 12, color: '#657080', marginBottom: 16 }}>
                  {editingReading.meterIdentifier} · {formatSafeDate(editingReading.readingDate)}
                </Text>

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
                      Prev Dial
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
                      value={editPrevReading}
                      onChangeText={setEditPrevReading}
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
                      keyboardType="numeric"
                      value={editCurrReading}
                      onChangeText={setEditCurrReading}
                    />
                  </View>
                </View>

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
                      value={editRate}
                      onChangeText={setEditRate}
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
                        setEditSplitMethod(prev =>
                          prev === 'equal' ? 'by_days_occupied' : 'equal',
                        )
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
                        {editSplitMethod === 'equal' ? 'Equal' : 'By Days'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: '#E0F7FA',
                    borderWidth: 1,
                    borderColor: '#80DEEA',
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#00838F' }}>
                    {editUnitsConsumed} Units Consumed · {formatINR(editTotalAmountPaise)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setEditingReading(null)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      backgroundColor: '#FAF5EB',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#657080' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 9999,
                      backgroundColor: '#4F5330',
                      alignItems: 'center',
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                        Save Changes
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          visible={Boolean(deletingReading)}
          onClose={() => setDeletingReading(null)}
          onConfirm={handleConfirmDeleteReading}
          title="Delete Reading?"
          message={`Are you sure you want to delete this meter reading (${deletingReading?.meterIdentifier})? Tenant charge adjustments cannot be undone.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Reading'}
          isLoading={isDeleting}
        />
      </View>
    </Modal>
  );
};
