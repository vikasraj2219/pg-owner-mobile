import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Building, Plus, Bed as BedIcon, Layers, Zap } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useProperties } from '../context/PropertyContext';
import { fetchPropertyMatrix, createRoom } from '../api/properties';
import { AddRoomModal } from './AddRoomModal';
import { AddPropertyModal } from './AddPropertyModal';
import { formatINR } from '../utils/currency';
import { IProperty, PropertyMatrixData } from '../types/api';

interface PropertiesRoomsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PropertiesRoomsModal: React.FC<PropertiesRoomsModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { properties, selectedProperty, selectedPropertyId, setSelectedPropertyId } =
    useProperties();

  const [activePropertyId, setActivePropertyId] = useState<string>(
    selectedPropertyId || (properties[0]?._id ?? ''),
  );
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  // Sync active property when selected property changes
  React.useEffect(() => {
    if (selectedPropertyId && !activePropertyId) {
      setActivePropertyId(selectedPropertyId);
    }
  }, [selectedPropertyId, activePropertyId]);

  const currentProperty: IProperty | undefined =
    properties.find(p => p._id === activePropertyId) || selectedProperty || properties[0];

  // Fetch Matrix (floors, rooms, beds) for the active property
  const { data: matrix, isLoading: isLoadingMatrix } = useQuery<PropertyMatrixData>({
    queryKey: ['propertyMatrix', activePropertyId],
    queryFn: () => fetchPropertyMatrix(activePropertyId),
    enabled: !!activePropertyId && visible,
  });

  // Create Room Mutation
  const addRoomMutation = useMutation({
    mutationFn: (payload: {
      floorNumber: number;
      roomNumber: string;
      sharingType: number;
      baseRentPaisePerBed: number;
      tags: string[];
    }) => {
      if (!activePropertyId) throw new Error('No property selected');
      return createRoom(activePropertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddRoom(false);
      Alert.alert('Room Created', 'New room and beds have been created successfully.');
    },
    onError: (err: { message?: string }) => {
      Alert.alert('Error Creating Room', err?.message || 'Failed to create room.');
    },
  });

  if (!visible) return null;

  const summary = matrix?.summary;
  const floors = matrix?.floors || [];

  // Extract all existing room numbers for duplicate prevention
  const existingRooms: string[] = [];
  floors.forEach(f => {
    f.rooms.forEach(r => existingRooms.push(r.roomNumber));
  });

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
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
              <Building size={20} color="#0A6C50" />
            </View>
            <View>
              <Text className="text-xl font-extrabold text-slate-900">Properties & Rooms</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Manage PG branches, rooms & bed allocations
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Property Selector Pills */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Property
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddProperty(true)}
                className="flex-row items-center gap-1"
              >
                <Plus size={14} color="#0A6C50" strokeWidth={2.5} />
                <Text className="text-xs font-bold text-[#0A6C50]">New Property</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2"
            >
              {properties.map(p => {
                const isSelected = p._id === activePropertyId;
                return (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => {
                      setActivePropertyId(p._id);
                      setSelectedPropertyId(p._id);
                    }}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center gap-2 mr-2 ${
                      isSelected
                        ? 'bg-[#0A6C50] border-[#0A6C50]'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <Building size={16} color={isSelected ? '#FFFFFF' : '#64748B'} />
                    <Text
                      className={`text-sm font-extrabold ${
                        isSelected ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Active Property Card Overview */}
          {currentProperty && (
            <View className="bg-white rounded-2xl p-4 border border-slate-200 mb-4 shadow-xs">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-lg font-extrabold text-slate-900">
                      {currentProperty.name}
                    </Text>
                    <View className="bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Text className="text-2xs font-black uppercase text-slate-600">
                        {currentProperty.type || 'Coliving'}
                      </Text>
                    </View>
                  </View>
                  {currentProperty.address ? (
                    <Text className="text-xs text-slate-500 font-medium" numberOfLines={2}>
                      {currentProperty.address}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => setShowAddRoom(true)}
                  className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5"
                >
                  <Plus size={15} color="#0A6C50" strokeWidth={2.5} />
                  <Text className="text-xs font-black text-[#0A6C50]">+ Room</Text>
                </TouchableOpacity>
              </View>

              {/* Quick stats counter */}
              <View className="flex-row pt-3 border-t border-slate-100 gap-2">
                <View className="flex-1 bg-slate-50 rounded-xl p-2.5 items-center">
                  <Text className="text-2xs font-bold text-slate-500">ROOMS</Text>
                  <Text className="text-base font-black text-slate-900 mt-0.5">
                    {summary?.totalRooms ?? currentProperty.stats?.totalRooms ?? 0}
                  </Text>
                </View>
                <View className="flex-1 bg-emerald-50 rounded-xl p-2.5 items-center">
                  <Text className="text-2xs font-bold text-emerald-700">VACANT</Text>
                  <Text className="text-base font-black text-emerald-900 mt-0.5">
                    {summary?.availableBeds ?? currentProperty.stats?.availableBeds ?? 0}
                  </Text>
                </View>
                <View className="flex-1 bg-rose-50 rounded-xl p-2.5 items-center">
                  <Text className="text-2xs font-bold text-rose-700">OCCUPIED</Text>
                  <Text className="text-base font-black text-rose-900 mt-0.5">
                    {summary?.occupiedBeds ?? currentProperty.stats?.occupiedBeds ?? 0}
                  </Text>
                </View>
                <View className="flex-1 bg-slate-50 rounded-xl p-2.5 items-center">
                  <Text className="text-2xs font-bold text-slate-500">TOTAL BEDS</Text>
                  <Text className="text-base font-black text-slate-900 mt-0.5">
                    {summary?.totalBeds ?? currentProperty.stats?.totalBeds ?? 0}
                  </Text>
                </View>
              </View>

              {/* UPI & Electricity details */}
              <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                <View className="flex-row items-center gap-1.5">
                  <Zap size={14} color="#0A6C50" />
                  <Text className="text-xs font-semibold text-slate-600">
                    EB:{' '}
                    {currentProperty.electricityRatePaisePerUnit
                      ? `${formatINR(currentProperty.electricityRatePaisePerUnit)}/unit`
                      : 'Not configured'}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-slate-700">
                  UPI: {currentProperty.upiVpa || 'None'}
                </Text>
              </View>
            </View>
          )}

          {/* Rooms by Floor */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Rooms & Beds Layout
              </Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push('/(tabs)/matrix');
                }}
              >
                <Text className="text-xs font-bold text-[#0A6C50]">Interactive Grid →</Text>
              </TouchableOpacity>
            </View>

            {isLoadingMatrix ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="small" color="#0A6C50" />
                <Text className="text-xs text-slate-500 font-medium mt-2">Loading rooms...</Text>
              </View>
            ) : floors.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 border border-slate-200 items-center justify-center shadow-xs">
                <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-3">
                  <Layers size={28} color="#0A6C50" />
                </View>
                <Text className="text-base font-extrabold text-slate-900 text-center">
                  No Rooms Configured Yet
                </Text>
                <Text className="text-xs text-slate-500 text-center max-w-[240px] mt-1 mb-4 font-medium">
                  Add rooms with sharing types to automatically generate beds for check-in.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowAddRoom(true)}
                  className="bg-[#0A6C50] px-5 py-2.5 rounded-xl flex-row items-center gap-2"
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text className="text-white font-extrabold text-sm">Add First Room</Text>
                </TouchableOpacity>
              </View>
            ) : (
              floors.map(floor => (
                <View key={floor.floorNumber} className="mb-4">
                  {/* Floor Header */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <Layers size={14} color="#64748B" />
                    <Text className="text-xs font-extrabold uppercase text-slate-600">
                      Floor {floor.floorNumber === 0 ? 'Ground (0)' : floor.floorNumber} ·{' '}
                      {floor.rooms.length} Room{floor.rooms.length === 1 ? '' : 's'}
                    </Text>
                  </View>

                  {/* Rooms on this Floor */}
                  {floor.rooms.map(room => (
                    <View
                      key={room._id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 mb-2.5 shadow-2xs"
                    >
                      <View className="flex-row items-start justify-between mb-2.5">
                        <View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-base font-black text-slate-900">
                              Room {room.roomNumber}
                            </Text>
                            <View className="bg-emerald-50 px-2 py-0.5 rounded-md">
                              <Text className="text-2xs font-extrabold text-emerald-800">
                                {room.sharingType} Sharing
                              </Text>
                            </View>
                          </View>
                          <Text className="text-xs font-bold text-slate-600 mt-0.5">
                            {formatINR(room.baseRentPaisePerBed)} / bed / mo
                          </Text>
                        </View>

                        {/* Room Tags */}
                        {room.tags && room.tags.length > 0 && (
                          <View className="flex-row flex-wrap gap-1 max-w-[140px] justify-end">
                            {room.tags.map((t, idx) => (
                              <View key={idx} className="bg-slate-100 px-2 py-0.5 rounded-md">
                                <Text className="text-2xs font-medium text-slate-600 capitalize">
                                  {t}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Beds list */}
                      <View className="pt-2 border-t border-slate-100">
                        <Text className="text-2xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          Beds ({room.beds.length})
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {room.beds.map(bed => {
                            const isAvailable = bed.status === 'available';
                            const isOccupied = bed.status === 'occupied';
                            const isNotice = bed.status === 'notice_period';

                            return (
                              <TouchableOpacity
                                key={bed._id}
                                activeOpacity={0.8}
                                onPress={() => {
                                  onClose();
                                  if (isAvailable) {
                                    router.push(`/checkin/${bed._id}`);
                                  } else {
                                    router.push('/(tabs)/matrix');
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${
                                  isAvailable
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : isOccupied
                                      ? 'bg-rose-50 border-rose-200'
                                      : isNotice
                                        ? 'bg-amber-50 border-amber-200'
                                        : 'bg-slate-100 border-slate-200'
                                }`}
                              >
                                <BedIcon
                                  size={13}
                                  color={
                                    isAvailable
                                      ? '#0A6C50'
                                      : isOccupied
                                        ? '#BE123C'
                                        : isNotice
                                          ? '#B45309'
                                          : '#475569'
                                  }
                                />
                                <Text
                                  className={`text-xs font-bold ${
                                    isAvailable
                                      ? 'text-emerald-900'
                                      : isOccupied
                                        ? 'text-rose-900'
                                        : isNotice
                                          ? 'text-amber-900'
                                          : 'text-slate-800'
                                  }`}
                                >
                                  Bed {bed.bedNumber}
                                </Text>
                                {isOccupied && bed.currentTenant?.fullName ? (
                                  <Text
                                    className="text-2xs text-rose-700 font-semibold"
                                    numberOfLines={1}
                                  >
                                    · {bed.currentTenant.fullName.split(' ')[0]}
                                  </Text>
                                ) : isAvailable ? (
                                  <Text className="text-2xs text-emerald-700 font-bold">
                                    · Check-in
                                  </Text>
                                ) : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Add Room Modal Sheet */}
        <AddRoomModal
          visible={showAddRoom}
          onClose={() => setShowAddRoom(false)}
          property={currentProperty || null}
          existingRooms={existingRooms}
          onSubmit={addRoomMutation.mutateAsync}
          isSubmitting={addRoomMutation.isPending}
        />

        {/* Add Property Modal */}
        <AddPropertyModal visible={showAddProperty} onClose={() => setShowAddProperty(false)} />
      </View>
    </Modal>
  );
};
