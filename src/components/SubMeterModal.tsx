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
import { X, Zap } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '../utils/currency';
import { recordMeterReadingApi, getMeterReadingsApi, getLatestRoomReadingApi } from '../api/meters';
import { fetchPropertyRooms } from '../api/properties';
import { IMeterReading, IRoom, IProperty } from '../types/api';

interface SubMeterModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
}

export const SubMeterModal: React.FC<SubMeterModalProps> = ({ visible, onClose, property }) => {
  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const [readings, setReadings] = useState<IMeterReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [previousReading, setPreviousReading] = useState('0');
  const [currentReading, setCurrentReading] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('12');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'by_days_occupied'>('equal');

  const loadRoomsAndReadings = useCallback(async () => {
    if (!property?._id) return;
    setIsLoading(true);
    try {
      const [roomsData, readingsData] = await Promise.all([
        fetchPropertyRooms(property._id),
        getMeterReadingsApi(property._id),
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
  }, [property?._id, selectedRoom]);

  useEffect(() => {
    if (visible && property?._id) {
      loadRoomsAndReadings();
      if (property.electricityRatePaisePerUnit) {
        setRatePerUnit((property.electricityRatePaisePerUnit / 100).toString());
      }
    }
  }, [visible, property, loadRoomsAndReadings]);

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
  const rateNum = parseFloat(ratePerUnit) || 12;

  const unitsConsumed = Math.max(0, currNum - prevNum);
  const totalAmountPaise = Math.round(unitsConsumed * rateNum * 100);

  const handleRecordReading = async () => {
    if (!property?._id || !selectedRoom?._id) return;

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
        propertyId: property._id,
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
            <Text className="text-xl font-extrabold text-slate-900">Sub-meter Electricity Log</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-0.5">
              {property?.name || 'Property'} · EB Split Calculator
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 text-sm font-medium mt-3">Loading meter records…</Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* Room Selector */}
            <Text className="text-xs font-bold text-slate-700 uppercase mb-2">Select Room</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {rooms.map(room => (
                  <TouchableOpacity
                    key={room._id}
                    onPress={() => setSelectedRoom(room)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      selectedRoom?._id === room._id
                        ? 'bg-[#E6F4EA] border-[#0A6C50]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selectedRoom?._id === room._id ? 'text-[#0A6C50]' : 'text-slate-700'
                      }`}
                    >
                      Room {room.roomNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Reading Input Card */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-5 shadow-xs">
              <Text className="text-sm font-extrabold text-slate-900 mb-3">
                Log New Dial Reading · Room {selectedRoom?.roomNumber || ''}
              </Text>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Previous Dial
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 bg-slate-50 font-bold"
                    keyboardType="numeric"
                    value={previousReading}
                    onChangeText={setPreviousReading}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-[#0A6C50] uppercase mb-1">
                    Current Dial
                  </Text>
                  <TextInput
                    className="border border-[#0A6C50] rounded-xl px-3.5 py-2.5 text-slate-900 bg-white font-black text-base"
                    placeholder="e.g. 1520"
                    keyboardType="numeric"
                    value={currentReading}
                    onChangeText={setCurrentReading}
                  />
                </View>
              </View>

              {/* Rate per unit & Split method */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Rate / Unit (₹)
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 bg-white font-bold"
                    keyboardType="numeric"
                    value={ratePerUnit}
                    onChangeText={setRatePerUnit}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Split Method
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setSplitMethod(prev => (prev === 'equal' ? 'by_days_occupied' : 'equal'))
                    }
                    className="border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 justify-center"
                  >
                    <Text className="text-xs font-bold text-slate-800">
                      {splitMethod === 'equal' ? 'Equal Split' : 'By Days Stayed'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calculated units & amount banner */}
              <View className="bg-[#ECFDF5] border border-[#6EE7B7] p-4 rounded-xl flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-xs font-bold text-[#0A6C50]">
                    {unitsConsumed} Units Consumed
                  </Text>
                  <Text className="text-xl font-extrabold text-[#0A6C50]">
                    {formatINR(totalAmountPaise)}
                  </Text>
                </View>
                <Zap size={24} color="#0A6C50" />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting || unitsConsumed === 0}
                onPress={handleRecordReading}
                className={`rounded-xl py-3.5 items-center justify-center ${
                  unitsConsumed > 0 ? 'bg-[#0A6C50]' : 'bg-slate-300'
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-sm">Record & Split Bill</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* History of Past Readings */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Past Meter Readings ({readings.length})
            </Text>
            {readings.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200 mb-6">
                <Text className="text-sm font-semibold text-slate-500">
                  No readings recorded yet.
                </Text>
              </View>
            ) : (
              readings.map(reading => (
                <View
                  key={reading._id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-2.5"
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-sm font-extrabold text-slate-900">
                      {reading.meterIdentifier || 'Sub-meter'}
                    </Text>
                    <Text className="text-sm font-black text-[#0A6C50]">
                      {formatINR(reading.totalAmountPaise)}
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-slate-500 mb-2">
                    {new Date(reading.readingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {reading.unitsConsumed} Units ({reading.previousReading} →{' '}
                    {reading.currentReading})
                  </Text>
                  {reading.tenantSplits && reading.tenantSplits.length > 0 && (
                    <View className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      {reading.tenantSplits.map((split, i) => (
                        <View key={i} className="flex-row justify-between py-0.5">
                          <Text className="text-xs text-slate-600 font-medium">
                            {typeof split.tenant === 'object' && split.tenant?.fullName
                              ? split.tenant.fullName
                              : `Tenant ${i + 1}`}
                          </Text>
                          <Text className="text-xs font-bold text-slate-800">
                            {formatINR(split.sharePaise)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};
