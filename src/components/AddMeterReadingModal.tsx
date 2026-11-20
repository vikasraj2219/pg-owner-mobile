import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { ArrowLeft, Zap, DoorClosed, Layers, Filter, Search } from 'lucide-react-native';
import { getPropertyImage } from '../utils/assetImages';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { recordMeterReadingApi, getLatestRoomReadingApi } from '../api/meters';
import { fetchPropertyRooms } from '../api/properties';
import { IRoom, IProperty } from '../types/api';
import { SuccessActionModal } from './SuccessActionModal';

export interface AddMeterReadingModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
  properties?: IProperty[];
  onSuccess?: () => void;
  defaultRoomId?: string;
}

export const AddMeterReadingModal: React.FC<AddMeterReadingModalProps> = ({
  visible,
  onClose,
  property,
  properties = [],
  onSuccess,
  defaultRoomId,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Form Inputs
  const [previousReading, setPreviousReading] = useState('0');
  const [currentReading, setCurrentReading] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('12');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'by_days_occupied'>('equal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedSuccessInfo, setRecordedSuccessInfo] = useState<{
    roomNumber: string;
    units: number;
    amountPaise: number;
  } | null>(null);

  // Load rooms when active property changes
  useEffect(() => {
    async function loadRooms() {
      if (!activeProperty?._id) return;
      setIsLoadingRooms(true);
      try {
        const roomsData = await fetchPropertyRooms(activeProperty._id);
        setRooms(roomsData);
        if (roomsData.length > 0) {
          if (defaultRoomId) {
            const found = roomsData.find(r => r._id === defaultRoomId);
            setSelectedRoom(found || roomsData[0]);
          } else {
            setSelectedRoom(roomsData[0]);
          }
        } else {
          setSelectedRoom(null);
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingRooms(false);
      }
    }
    if (visible && activeProperty?._id) {
      loadRooms();
      if (activeProperty.electricityRatePaisePerUnit) {
        setRatePerUnit((activeProperty.electricityRatePaisePerUnit / 100).toString());
      }
    }
  }, [visible, activeProperty, defaultRoomId]);

  // Load latest reading when selected room changes
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

  const floorsList = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.floorNumber))).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesFloor = selectedFloor === 'all' || r.floorNumber === selectedFloor;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || r.roomNumber.toLowerCase().includes(q);
      return matchesFloor && matchesSearch;
    });
  }, [rooms, selectedFloor, searchQuery]);

  const prevNum = parseFloat(previousReading) || 0;
  const currNum = parseFloat(currentReading) || 0;
  const rateNum = isNaN(parseFloat(ratePerUnit)) ? 0 : parseFloat(ratePerUnit);
  const unitsConsumed = Math.max(0, currNum - prevNum);
  const totalAmountPaise = Math.round(unitsConsumed * rateNum * 100);

  const handleRecord = async () => {
    if (!activeProperty?._id || !selectedRoom?._id) {
      Alert.alert('Required', 'Please select a room to log meter reading.');
      return;
    }

    if (!currentReading.trim()) {
      Alert.alert('Required Field', 'Please enter the current dial reading.');
      return;
    }

    if (currNum < prevNum) {
      Alert.alert(
        'Invalid Reading',
        `Current dial (${currNum}) cannot be lower than previous dial (${prevNum}). If a new meter was installed, you can edit the previous dial.`,
      );
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

      setRecordedSuccessInfo({
        roomNumber: selectedRoom.roomNumber,
        units: unitsConsumed,
        amountPaise: totalAmountPaise,
      });
    } catch {
      Alert.alert('Error', 'Failed to record meter reading. Please try again.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
      >
        {/* Top Header */}
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
            activeOpacity={0.7}
            onPress={onClose}
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
              Log Sub-meter Reading
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#657080',
                marginTop: 2,
              }}
            >
              {activeProperty?.name || 'Property'} · EB Split Calculator
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Filter Bar */}
          {(properties.length > 1 || (!property && properties.length > 0)) && (
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Filter size={13} color="#0C192B" strokeWidth={2.2} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>Property</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
              >
                {properties.map((p, idx) => {
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

          {/* Floor Filter Chips */}
          {floorsList.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Layers size={13} color="#0C192B" strokeWidth={2.2} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
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
                    All Floors ({rooms.length})
                  </Text>
                </TouchableOpacity>

                {floorsList.map(floor => {
                  const isActive = selectedFloor === floor;
                  const floorCount = rooms.filter(r => r.floorNumber === floor).length;
                  return (
                    <TouchableOpacity
                      key={`modal-flr-${floor}`}
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
                        Floor {floor === 0 ? 'Ground' : floor} ({floorCount})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search Room Input */}
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
              placeholder="Search room number..."
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

          {/* Room Selector Chips */}
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <DoorClosed size={13} color="#0C192B" strokeWidth={2.2} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0C192B' }}>
                Select Room * {selectedRoom ? `(Room ${selectedRoom.roomNumber} selected)` : ''}
              </Text>
            </View>

            {isLoadingRooms ? (
              <ActivityIndicator size="small" color="#4F5330" style={{ paddingVertical: 12 }} />
            ) : filteredRooms.length === 0 ? (
              <Text
                style={{ fontSize: 12, color: '#657080', fontStyle: 'italic', paddingVertical: 6 }}
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
                      onPress={() => setSelectedRoom(room)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
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

          {/* Reading Input Form Card */}
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

            {/* Previous & Current Dial Inputs */}
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
                <Text style={{ fontSize: 10, color: '#657080', marginTop: 4 }}>
                  Meter reset? Edit dial
                </Text>
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

            {/* Rate per Unit & Split Method */}
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

            {/* Live Calculation Banner */}
            <View
              style={{
                backgroundColor: unitsConsumed === 0 ? '#FAF5EB' : '#E0F7FA',
                borderWidth: 1,
                borderColor: unitsConsumed === 0 ? '#E5DDCD' : '#80DEEA',
                padding: 14,
                borderRadius: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: unitsConsumed === 0 ? '#657080' : '#00838F',
                  }}
                >
                  {unitsConsumed === 0
                    ? '0 Units (Locked / No Usage)'
                    : `${unitsConsumed} Units Consumed`}
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
                  backgroundColor: unitsConsumed === 0 ? '#E5DDCD' : '#B2EBF2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={20} color={unitsConsumed === 0 ? '#657080' : '#00838F'} />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting || !currentReading.trim() || currNum < prevNum}
              onPress={handleRecord}
              style={{
                borderRadius: 9999,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  currentReading.trim() && currNum >= prevNum ? '#4F5330' : '#CBD5E1',
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
                  {unitsConsumed === 0 ? 'Record 0 Units Reading (₹0)' : 'Record & Split Bill'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modern In-App Success Modal */}
        <SuccessActionModal
          visible={!!recordedSuccessInfo}
          onClose={() => {
            setRecordedSuccessInfo(null);
            setCurrentReading('');
            onClose();
            if (onSuccess) onSuccess();
          }}
          title="Reading Recorded Successfully!"
          message={
            recordedSuccessInfo?.units === 0
              ? `Room ${recordedSuccessInfo?.roomNumber} logged 0 units consumed (₹0 bill). No tenant charges applied.`
              : `Room ${recordedSuccessInfo?.roomNumber} meter reading has been saved and the bill split among active tenants.`
          }
          highlightCard={{
            icon: <Zap size={16} color="#00838F" />,
            title: `Room ${recordedSuccessInfo?.roomNumber} · ${recordedSuccessInfo?.units} Units`,
            subtitle: recordedSuccessInfo
              ? recordedSuccessInfo.amountPaise === 0
                ? 'Zero consumption (₹0)'
                : `Total EB Charge: ${formatINR(recordedSuccessInfo.amountPaise)}`
              : '',
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
