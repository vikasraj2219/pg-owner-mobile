import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Building,
  Plus,
  Bed as BedIcon,
  Layers,
  Zap,
  Pencil,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Crown,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useProperties } from '../context/PropertyContext';
import { useAuth } from '../hooks/useAuth';
import { fetchPropertyMatrix, createRoom } from '../api/properties';
import { AddRoomModal } from './AddRoomModal';
import { AddPropertyModal } from './AddPropertyModal';
import { EditPropertyModal } from './EditPropertyModal';
import { EditRoomModal } from './EditRoomModal';
import { AddFloorModal } from './AddFloorModal';
import { EditFloorModal } from './EditFloorModal';
import { AddBedModal } from './AddBedModal';
import { EditBedModal } from './EditBedModal';
import { SubscriptionModal } from './SubscriptionModal';
import { formatINR } from '../utils/currency';
import { IProperty, PropertyMatrixData, IMatrixFloor, IMatrixRoom, IMatrixBed } from '../types/api';

interface PropertiesRoomsModalProps {
  visible: boolean;
  onClose: () => void;
}

type ViewLevel = 'properties' | 'property_detail' | 'floor_rooms' | 'room_beds';

export const PropertiesRoomsModal: React.FC<PropertiesRoomsModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { subscription } = useAuth();
  const { properties, selectedProperty, selectedPropertyId, setSelectedPropertyId } =
    useProperties();

  // Navigation Stack State
  const [viewLevel, setViewLevel] = useState<ViewLevel>('properties');
  const [activePropId, setActivePropId] = useState<string>(
    selectedPropertyId || (properties[0]?._id ?? ''),
  );
  const [activeFloorNumber, setActiveFloorNumber] = useState<number | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Modal dialog states
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showEditProperty, setShowEditProperty] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [floorToEdit, setFloorToEdit] = useState<IMatrixFloor | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addRoomDefaultFloor, setAddRoomDefaultFloor] = useState<number>(1);
  const [roomToEdit, setRoomToEdit] = useState<IMatrixRoom | null>(null);
  const [showAddBed, setShowAddBed] = useState(false);
  const [bedToEdit, setBedToEdit] = useState<IMatrixBed | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Synchronize active property when opening
  React.useEffect(() => {
    if (visible && selectedPropertyId && !activePropId) {
      setActivePropId(selectedPropertyId);
    }
  }, [visible, selectedPropertyId, activePropId]);

  // Fetch Matrix for active property
  const { data: matrix, isLoading: isLoadingMatrix } = useQuery<PropertyMatrixData>({
    queryKey: ['propertyMatrix', activePropId],
    queryFn: () => fetchPropertyMatrix(activePropId),
    enabled: !!activePropId && visible,
  });

  const activeProperty: IProperty | undefined =
    properties.find(p => p._id === activePropId) || selectedProperty || properties[0];

  const floors = matrix?.floors || [];
  const summary = matrix?.summary;

  const activeFloor = useMemo(() => {
    if (activeFloorNumber === null) return null;
    return floors.find(f => f.floorNumber === activeFloorNumber) || null;
  }, [floors, activeFloorNumber]);

  const activeRoom = useMemo(() => {
    if (!activeRoomId || !activeFloor) return null;
    return activeFloor.rooms.find(r => r._id === activeRoomId) || null;
  }, [activeFloor, activeRoomId]);

  // All room numbers in property for duplicate checking
  const existingRooms = useMemo(() => {
    const list: string[] = [];
    floors.forEach(f => {
      f.rooms.forEach(r => list.push(r.roomNumber));
    });
    return list;
  }, [floors]);

  // Create Room Mutation
  const addRoomMutation = useMutation({
    mutationFn: (payload: {
      floorNumber: number;
      roomNumber: string;
      sharingType: number;
      baseRentPaisePerBed: number;
      tags: string[];
    }) => {
      if (!activePropId) throw new Error('No property selected');
      return createRoom(activePropId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddRoom(false);
      Alert.alert('Room Created', 'New room and beds created successfully.');
    },
    onError: (err: { message?: string }) => {
      Alert.alert('Error Creating Room', err?.message || 'Failed to create room.');
    },
  });

  if (!visible) return null;

  // Max properties allowed by subscription plan
  const maxPropsAllowed = subscription?.maxProperties || 1;
  const isAtPropertyLimit = properties.length >= maxPropsAllowed;

  // Back Navigation Handler
  const handleBack = () => {
    if (viewLevel === 'room_beds') {
      setActiveRoomId(null);
      setViewLevel('floor_rooms');
    } else if (viewLevel === 'floor_rooms') {
      setActiveFloorNumber(null);
      setViewLevel('property_detail');
    } else if (viewLevel === 'property_detail') {
      setViewLevel('properties');
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleBack}
    >
      <View className="flex-1 bg-[#F8F9FA]">
        {/* ========================================================================= */}
        {/* VIEW 1: PROPERTIES LIST (Design Page 1)                                   */}
        {/* ========================================================================= */}
        {viewLevel === 'properties' && (
          <View className="flex-1">
            {/* Top Navigation */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
              <View>
                <Text className="text-xl font-extrabold text-slate-900">Properties</Text>
                <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                  {properties.length} of {maxPropsAllowed}{' '}
                  {maxPropsAllowed === 1 ? 'property' : 'properties'} used
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
              {/* Plan Limit Banner */}
              {isAtPropertyLimit && (
                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
                  <View className="flex-1 mr-3 flex-row items-center gap-2.5">
                    <Crown size={18} color="#D97706" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-amber-900">
                        {subscription?.plan ? subscription.plan.toUpperCase() : 'STARTER'} Plan
                        Limit Reached
                      </Text>
                      <Text className="text-2xs text-amber-700 font-medium mt-0.5">
                        Upgrade to manage multiple PG buildings and branches.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowSubscriptionModal(true)}
                    className="bg-[#0A6C50] px-3 py-1.5 rounded-xl"
                  >
                    <Text className="text-xs font-black text-white">Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Property Cards */}
              <View className="gap-3 mb-8">
                {properties.map(property => {
                  const stats = property.stats;
                  const totalBeds = stats?.totalBeds || 0;
                  const occupiedBeds = stats?.occupiedBeds || 0;
                  const occupancyRate = stats?.occupancyRate || 0;
                  const totalFloors = stats?.totalFloors || property.floors?.length || 1;
                  const totalRooms = stats?.totalRooms || 0;

                  return (
                    <TouchableOpacity
                      key={property._id}
                      activeOpacity={0.85}
                      onPress={() => {
                        setActivePropId(property._id);
                        setSelectedPropertyId(property._id);
                        setViewLevel('property_detail');
                      }}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                          <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                            <Building size={20} color="#0A6C50" />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-base font-extrabold text-slate-900"
                              numberOfLines={1}
                            >
                              {property.name}
                            </Text>
                            <View className="flex-row items-center gap-1.5 mt-0.5">
                              <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                                <Text className="text-2xs font-bold uppercase text-slate-600">
                                  {property.type || 'Coliving'}
                                </Text>
                              </View>
                              {property.city ? (
                                <Text
                                  className="text-xs text-slate-500 font-medium"
                                  numberOfLines={1}
                                >
                                  · {property.city}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                        <ChevronRight size={18} color="#94A3B8" />
                      </View>

                      {/* Mini Stats Row */}
                      <Text className="text-xs font-semibold text-slate-600 mb-3">
                        {totalFloors} floor{totalFloors === 1 ? '' : 's'} · {totalRooms} room
                        {totalRooms === 1 ? '' : 's'} · {totalBeds} bed{totalBeds === 1 ? '' : 's'}
                      </Text>

                      {/* Occupancy Progress Bar */}
                      <View className="bg-slate-100 h-2 rounded-full overflow-hidden mb-1.5">
                        <View
                          className="h-full bg-[#0A6C50] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, occupancyRate))}%` }}
                        />
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-2xs font-semibold text-slate-500">
                          {occupiedBeds} of {totalBeds} occupied ({occupancyRate}%)
                        </Text>
                        {property.isArchived ? (
                          <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                            <Text className="text-2xs font-black uppercase text-amber-800">
                              Archived
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Add Property Button */}
            <View className="p-4 border-t border-slate-200 bg-white shadow-lg">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (isAtPropertyLimit) {
                    setShowSubscriptionModal(true);
                  } else {
                    setShowAddProperty(true);
                  }
                }}
                className="w-full bg-[#0A6C50] py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-white font-extrabold text-base">Add property</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PROPERTY DETAIL / FLOORS VIEW (Design Page 2)                     */}
        {/* ========================================================================= */}
        {viewLevel === 'property_detail' && activeProperty && (
          <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <TouchableOpacity
                  onPress={handleBack}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center -ml-1"
                >
                  <ChevronLeft size={22} color="#1E293B" />
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900" numberOfLines={1}>
                    {activeProperty.name}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500">
                    {activeProperty.city || 'Bangalore'} ·{' '}
                    {activeProperty.type
                      ? activeProperty.type.charAt(0).toUpperCase() + activeProperty.type.slice(1)
                      : 'Coliving'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  onPress={() => setShowEditProperty(true)}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Pencil size={16} color="#334155" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
              {/* 4 Stat Boxes (Floors, Rooms, Beds, % Full) */}
              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs items-center">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Floors
                  </Text>
                  <Text className="text-xl font-black text-slate-900 mt-1">
                    {floors.length || activeProperty.stats?.totalFloors || 1}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs items-center">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Rooms
                  </Text>
                  <Text className="text-xl font-black text-slate-900 mt-1">
                    {summary?.totalRooms ?? activeProperty.stats?.totalRooms ?? 0}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs items-center">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Beds
                  </Text>
                  <Text className="text-xl font-black text-slate-900 mt-1">
                    {summary?.totalBeds ?? activeProperty.stats?.totalBeds ?? 0}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs items-center">
                  <Text className="text-2xs font-bold text-[#0A6C50] uppercase tracking-wider">
                    % Full
                  </Text>
                  <Text className="text-xl font-black text-[#0A6C50] mt-1">
                    {summary?.occupancyRate ?? activeProperty.stats?.occupancyRate ?? 0}%
                  </Text>
                </View>
              </View>

              {/* UPI & Electricity strip */}
              <View className="bg-white rounded-2xl p-3.5 border border-slate-200 mb-5 shadow-2xs flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <Zap size={15} color="#0A6C50" />
                  <Text className="text-xs font-semibold text-slate-700" numberOfLines={1}>
                    EB:{' '}
                    {activeProperty.electricityRatePaisePerUnit
                      ? `${formatINR(activeProperty.electricityRatePaisePerUnit)}/unit`
                      : '₹12/unit'}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                  UPI: {activeProperty.upiVpa || 'None'}
                </Text>
              </View>

              {/* Section Header: FLOORS */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  FLOORS ({floors.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddFloor(true)}
                  className="flex-row items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  <Plus size={14} color="#0A6C50" strokeWidth={2.5} />
                  <Text className="text-xs font-bold text-[#0A6C50]">Add floor</Text>
                </TouchableOpacity>
              </View>

              {isLoadingMatrix ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="small" color="#0A6C50" />
                  <Text className="text-xs text-slate-500 font-medium mt-2">Loading floors...</Text>
                </View>
              ) : floors.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 border border-slate-200 items-center justify-center shadow-xs">
                  <Layers size={32} color="#0A6C50" />
                  <Text className="text-base font-extrabold text-slate-900 mt-2 text-center">
                    No Floors Added Yet
                  </Text>
                  <Text className="text-xs text-slate-500 text-center max-w-[240px] mt-1 mb-4">
                    Add your first floor to organize rooms and beds.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddFloor(true)}
                    className="bg-[#0A6C50] px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-xs">Add First Floor</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-2.5 mb-8">
                  {floors.map(floor => {
                    const roomsCount = floor.rooms.length;
                    const totalFloorBeds = floor.rooms.reduce((acc, r) => acc + r.beds.length, 0);
                    const occupiedFloorBeds = floor.rooms.reduce(
                      (acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length,
                      0,
                    );

                    return (
                      <TouchableOpacity
                        key={floor.floorNumber}
                        activeOpacity={0.85}
                        onPress={() => {
                          setActiveFloorNumber(floor.floorNumber);
                          setViewLevel('floor_rooms');
                        }}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-3 flex-1 mr-2">
                          <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                            <Layers size={18} color="#475569" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-extrabold text-slate-900">
                              Floor {floor.floorNumber === 0 ? 'Ground (0)' : floor.floorNumber}
                              {floor.floorLabel ? ` · ${floor.floorLabel}` : ''}
                            </Text>
                            <Text className="text-xs text-slate-500 font-medium mt-0.5">
                              {roomsCount} room{roomsCount === 1 ? '' : 's'} · {totalFloorBeds} bed
                              {totalFloorBeds === 1 ? '' : 's'} · {occupiedFloorBeds} occupied
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            onPress={() => setFloorToEdit(floor)}
                            className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-200"
                          >
                            <Pencil size={13} color="#475569" />
                          </TouchableOpacity>
                          <ChevronRight size={18} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FLOOR ROOMS VIEW (Design Page 9)                                  */}
        {/* ========================================================================= */}
        {viewLevel === 'floor_rooms' && activeFloor && activeProperty && (
          <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <TouchableOpacity
                  onPress={handleBack}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center -ml-1"
                >
                  <ChevronLeft size={22} color="#1E293B" />
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900" numberOfLines={1}>
                    Floor {activeFloor.floorNumber === 0 ? 'Ground' : activeFloor.floorNumber}
                    {activeFloor.floorLabel ? ` · ${activeFloor.floorLabel}` : ''}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500" numberOfLines={1}>
                    {activeProperty.name} · {activeFloor.rooms.length} rooms
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  onPress={() => setFloorToEdit(activeFloor)}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Pencil size={16} color="#334155" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
              {activeFloor.rooms.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 border border-slate-200 items-center justify-center shadow-xs">
                  <DoorOpen size={32} color="#0A6C50" />
                  <Text className="text-base font-extrabold text-slate-900 mt-2 text-center">
                    No Rooms On This Floor
                  </Text>
                  <Text className="text-xs text-slate-500 text-center max-w-[240px] mt-1 mb-4">
                    Add rooms with sharing type to auto-generate beds.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddRoomDefaultFloor(activeFloor.floorNumber);
                      setShowAddRoom(true);
                    }}
                    className="bg-[#0A6C50] px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-xs">Add Room</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-2.5 mb-8">
                  {activeFloor.rooms.map(room => {
                    const totalBeds = room.beds.length;
                    const occupiedBeds = room.beds.filter(b => b.status === 'occupied').length;

                    return (
                      <TouchableOpacity
                        key={room._id}
                        activeOpacity={0.85}
                        onPress={() => {
                          setActiveRoomId(room._id);
                          setViewLevel('room_beds');
                        }}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs"
                      >
                        <View className="flex-row items-start justify-between mb-2">
                          <View>
                            <Text className="text-base font-black text-slate-900">
                              Room {room.roomNumber}
                            </Text>
                            <Text className="text-xs font-semibold text-slate-600 mt-0.5">
                              {occupiedBeds} of {totalBeds} beds ·{' '}
                              {formatINR(room.baseRentPaisePerBed)}/bed
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1.5">
                            <TouchableOpacity
                              onPress={() => setRoomToEdit(room)}
                              className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center border border-slate-200"
                            >
                              <Pencil size={12} color="#475569" />
                            </TouchableOpacity>
                            <ChevronRight size={18} color="#94A3B8" />
                          </View>
                        </View>

                        {/* Room Tags */}
                        <View className="flex-row flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                          <View className="bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Text className="text-2xs font-extrabold text-emerald-800">
                              {room.sharingType === 1
                                ? 'Single'
                                : room.sharingType === 2
                                  ? 'Double'
                                  : room.sharingType === 3
                                    ? 'Triple'
                                    : `${room.sharingType} Sharing`}
                            </Text>
                          </View>
                          {room.tags &&
                            room.tags.map((tag, idx) => (
                              <View key={idx} className="bg-slate-100 px-2 py-0.5 rounded-md">
                                <Text className="text-2xs font-medium text-slate-600">{tag}</Text>
                              </View>
                            ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Bottom Add Room Button */}
            <View className="p-4 border-t border-slate-200 bg-white shadow-lg">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setAddRoomDefaultFloor(activeFloor.floorNumber);
                  setShowAddRoom(true);
                }}
                className="w-full bg-[#0A6C50] py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-white font-extrabold text-base">Add room</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ROOM DETAIL / BEDS VIEW (Design Page 10)                           */}
        {/* ========================================================================= */}
        {viewLevel === 'room_beds' && activeRoom && activeFloor && activeProperty && (
          <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <TouchableOpacity
                  onPress={handleBack}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center -ml-1"
                >
                  <ChevronLeft size={22} color="#1E293B" />
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900" numberOfLines={1}>
                    Room {activeRoom.roomNumber}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500" numberOfLines={1}>
                    Floor {activeFloor.floorNumber} · {activeProperty.name}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  onPress={() => setRoomToEdit(activeRoom)}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Pencil size={16} color="#334155" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
              {/* Tags Row */}
              <View className="flex-row flex-wrap gap-1.5 mb-3.5">
                <View className="bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <Text className="text-xs font-extrabold text-emerald-800">
                    {activeRoom.sharingType === 1
                      ? 'Single'
                      : activeRoom.sharingType === 2
                        ? 'Double'
                        : activeRoom.sharingType === 3
                          ? 'Triple'
                          : `${activeRoom.sharingType} Sharing`}
                  </Text>
                </View>
                {activeRoom.tags &&
                  activeRoom.tags.map((tag, idx) => (
                    <View key={idx} className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Text className="text-xs font-semibold text-slate-600">{tag}</Text>
                    </View>
                  ))}
              </View>

              {/* 2 Stat Boxes */}
              <View className="flex-row gap-3 mb-5">
                <View className="flex-1 bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Rent per bed
                  </Text>
                  <Text className="text-lg font-black text-slate-900 mt-0.5">
                    {formatINR(activeRoom.baseRentPaisePerBed)}/mo
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                  <Text className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Occupied
                  </Text>
                  <Text className="text-lg font-black text-emerald-700 mt-0.5">
                    {activeRoom.beds.filter(b => b.status === 'occupied').length} of{' '}
                    {activeRoom.beds.length}
                  </Text>
                </View>
              </View>

              {/* Section Header: BEDS */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  BEDS ({activeRoom.beds.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddBed(true)}
                  className="flex-row items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  <Plus size={14} color="#0A6C50" strokeWidth={2.5} />
                  <Text className="text-xs font-bold text-[#0A6C50]">Add bed</Text>
                </TouchableOpacity>
              </View>

              {/* Bed Cards */}
              <View className="gap-2.5 mb-8">
                {activeRoom.beds.map(bed => {
                  const isAvailable = bed.status === 'available';
                  const isOccupied = bed.status === 'occupied';
                  const tenantName = bed.currentTenant?.fullName;

                  return (
                    <TouchableOpacity
                      key={bed._id}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isAvailable) {
                          onClose();
                          router.push(`/checkin/${bed._id}` as any);
                        } else if (isOccupied && bed.currentTenant?._id) {
                          onClose();
                          router.push(`/tenant/${bed.currentTenant._id}` as any);
                        } else {
                          setBedToEdit(bed);
                        }
                      }}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        <View
                          className={`w-10 h-10 rounded-xl items-center justify-center ${
                            isAvailable
                              ? 'bg-emerald-50'
                              : isOccupied
                                ? 'bg-blue-50'
                                : 'bg-amber-50'
                          }`}
                        >
                          <BedIcon
                            size={18}
                            color={isAvailable ? '#0A6C50' : isOccupied ? '#1D4ED8' : '#D97706'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-extrabold text-slate-900">
                            Bed {bed.bedNumber}
                          </Text>
                          <Text
                            className={`text-xs font-medium mt-0.5 ${
                              isOccupied
                                ? 'text-blue-700 font-semibold'
                                : isAvailable
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                            }`}
                            numberOfLines={1}
                          >
                            {isOccupied && tenantName
                              ? `${tenantName} · ${formatINR(bed.currentTenant?.monthlyRentPaise || activeRoom.baseRentPaisePerBed)}/mo`
                              : isAvailable
                                ? 'Available for check-in'
                                : `Under maintenance ${bed.maintenanceNote ? '· ' + bed.maintenanceNote : ''}`}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        {/* Status Pill */}
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            isOccupied
                              ? 'bg-blue-100'
                              : isAvailable
                                ? 'bg-emerald-100'
                                : 'bg-amber-100'
                          }`}
                        >
                          <Text
                            className={`text-2xs font-extrabold capitalize ${
                              isOccupied
                                ? 'text-blue-800'
                                : isAvailable
                                  ? 'text-emerald-800'
                                  : 'text-amber-800'
                            }`}
                          >
                            {isAvailable ? 'Vacant' : isOccupied ? 'Occupied' : 'Maintenance'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setBedToEdit(bed)}
                          className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-200"
                        >
                          <Pencil size={12} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Edit Room & Delete Room Actions */}
            <View className="p-4 border-t border-slate-200 bg-white shadow-lg flex-row gap-2.5">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRoomToEdit(activeRoom)}
                className="flex-1 bg-[#0A6C50] py-3.5 rounded-xl items-center justify-center shadow-xs"
              >
                <Text className="text-white font-extrabold text-sm">Edit room</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODALS & SHEETS                                                       */}
        {/* ========================================================================= */}

        {/* Add Property Modal */}
        <AddPropertyModal visible={showAddProperty} onClose={() => setShowAddProperty(false)} />

        {/* Edit Property Modal */}
        <EditPropertyModal
          visible={showEditProperty}
          property={activeProperty || null}
          onClose={() => setShowEditProperty(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          }}
        />

        {/* Add Floor Modal */}
        <AddFloorModal
          visible={showAddFloor}
          propertyId={activePropId}
          defaultFloorNumber={(floors[floors.length - 1]?.floorNumber ?? 0) + 1}
          onClose={() => setShowAddFloor(false)}
          onFloorCreated={(floorNum, _label, addRoomsNext) => {
            if (addRoomsNext) {
              setAddRoomDefaultFloor(floorNum);
              setShowAddRoom(true);
            }
          }}
        />

        {/* Edit Floor Modal */}
        <EditFloorModal
          visible={!!floorToEdit}
          propertyId={activePropId}
          floor={floorToEdit}
          onClose={() => setFloorToEdit(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          }}
        />

        {/* Add Room Modal */}
        <AddRoomModal
          visible={showAddRoom}
          onClose={() => setShowAddRoom(false)}
          property={activeProperty || null}
          existingRooms={existingRooms}
          defaultFloor={addRoomDefaultFloor}
          onSubmit={addRoomMutation.mutateAsync}
          isSubmitting={addRoomMutation.isPending}
        />

        {/* Edit Room Modal */}
        <EditRoomModal
          visible={!!roomToEdit}
          propertyId={activePropId}
          room={roomToEdit}
          onClose={() => setRoomToEdit(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['matrix'] });
          }}
        />

        {/* Add Bed Modal */}
        <AddBedModal
          visible={showAddBed}
          propertyId={activePropId}
          room={activeRoom}
          onClose={() => setShowAddBed(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
          }}
        />

        {/* Edit Bed Modal */}
        <EditBedModal
          visible={!!bedToEdit}
          propertyId={activePropId}
          room={activeRoom}
          bed={bedToEdit}
          onClose={() => setBedToEdit(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['propertyMatrix', activePropId] });
          }}
          onViewTenant={tenantId => {
            onClose();
            router.push(`/tenant/${tenantId}` as any);
          }}
        />

        {/* Subscription Upgrade Modal */}
        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      </View>
    </Modal>
  );
};
