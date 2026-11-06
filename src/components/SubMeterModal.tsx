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
import { X, Zap, Edit2, Trash2 } from 'lucide-react-native';
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
  const rateNum = isNaN(parseFloat(ratePerUnit)) ? 0 : parseFloat(ratePerUnit);

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
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-3 shadow-xs"
                >
                  <View className="flex-row justify-between items-start mb-1">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-extrabold text-slate-900">
                        {reading.meterIdentifier || 'Sub-meter'}
                      </Text>
                      <Text className="text-xs font-medium text-slate-500 mt-0.5">
                        {formatSafeDate(reading.readingDate)} · {reading.unitsConsumed} Units (
                        {reading.previousReading} → {reading.currentReading}) @ ₹
                        {(reading.ratePaisePerUnit / 100).toFixed(0)}/u
                      </Text>
                    </View>
                    <Text className="text-base font-black text-[#0A6C50]">
                      {formatINR(reading.totalAmountPaise)}
                    </Text>
                  </View>

                  {/* Tenant Splits */}
                  {reading.tenantSplits && reading.tenantSplits.length > 0 && (
                    <View className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 my-2">
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

                  {/* Actions: Edit & Delete */}
                  <View className="flex-row justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(reading)}
                      className="flex-row items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200"
                    >
                      <Edit2 size={13} color="#0A6C50" />
                      <Text className="text-xs font-bold text-[#0A6C50] ml-1.5">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteReading(reading)}
                      className="flex-row items-center px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
                    >
                      <Trash2 size={13} color="#BE123C" />
                      <Text className="text-xs font-bold text-rose-700 ml-1.5">Delete</Text>
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
            <View className="flex-1 bg-black/50 justify-center items-center px-5">
              <View className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-lg">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-extrabold text-slate-900">
                    Edit Meter Reading
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingReading(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text className="text-xs text-slate-500 font-medium mb-3">
                  {editingReading.meterIdentifier || 'Sub-meter'}
                </Text>

                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Previous Dial
                    </Text>
                    <TextInput
                      className="border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-slate-50 font-bold text-sm"
                      keyboardType="numeric"
                      value={editPrevReading}
                      onChangeText={setEditPrevReading}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#0A6C50] uppercase mb-1">
                      Current Dial
                    </Text>
                    <TextInput
                      className="border border-[#0A6C50] rounded-xl px-3 py-2 text-slate-900 bg-white font-black text-sm"
                      keyboardType="numeric"
                      value={editCurrReading}
                      onChangeText={setEditCurrReading}
                    />
                  </View>
                </View>

                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Rate / Unit (₹)
                    </Text>
                    <TextInput
                      className="border border-slate-200 rounded-xl px-3 py-2 text-slate-900 bg-white font-bold text-sm"
                      keyboardType="numeric"
                      value={editRate}
                      onChangeText={setEditRate}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Split Method
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setEditSplitMethod(prev =>
                          prev === 'equal' ? 'by_days_occupied' : 'equal',
                        )
                      }
                      className="border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 justify-center items-center"
                    >
                      <Text className="text-xs font-bold text-slate-800">
                        {editSplitMethod === 'equal' ? 'Equal' : 'By Days'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Live Preview */}
                <View className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 mb-4 flex-row justify-between items-center">
                  <View>
                    <Text className="text-xs font-bold text-[#0A6C50]">
                      {editUnitsConsumed} Units Consumed
                    </Text>
                    <Text className="text-lg font-black text-[#0A6C50]">
                      {formatINR(editTotalAmountPaise)}
                    </Text>
                  </View>
                  <Zap size={20} color="#0A6C50" />
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setEditingReading(null)}
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
