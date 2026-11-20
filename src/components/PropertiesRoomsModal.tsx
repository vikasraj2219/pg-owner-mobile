import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import {
  Plus,
  Bed as BedIcon,
  Layers,
  Zap,
  Pencil,
  ArrowLeft,
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
import { SubMeterModal } from './SubMeterModal';
import { formatINR } from '../utils/currency';
import { IProperty, PropertyMatrixData, IMatrixFloor, IMatrixRoom, IMatrixBed } from '../types/api';
import { getPropertyImage } from '../utils/assetImages';

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
  const [showSubMeterModal, setShowSubMeterModal] = useState(false);
  const [subMeterRoomNumber, setSubMeterRoomNumber] = useState<string | undefined>(undefined);

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
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* ========================================================================= */}
        {/* VIEW 1: PROPERTIES LIST                                                   */}
        {/* ========================================================================= */}
        {viewLevel === 'properties' && (
          <View style={{ flex: 1 }}>
            {/* Top Navigation */}
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
                  Properties & Rooms
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}>
                  {properties.length} of {maxPropsAllowed}{' '}
                  {maxPropsAllowed === 1 ? 'property' : 'properties'} used
                </Text>
              </View>

              {/* Header Add Property Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (isAtPropertyLimit) {
                    setShowSubscriptionModal(true);
                  } else {
                    setShowAddProperty(true);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#4F5330',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  marginLeft: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  Add Property
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Plan Limit Banner */}
              {isAtPropertyLimit && (
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{ flex: 1, marginRight: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Crown size={18} color="#D97706" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                        {subscription?.plan ? subscription.plan.toUpperCase() : 'STARTER'} Plan
                        Limit Reached
                      </Text>
                      <Text
                        style={{ fontSize: 11, fontWeight: '500', color: '#B45309', marginTop: 1 }}
                      >
                        Upgrade to manage multiple PG buildings and branches.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowSubscriptionModal(true)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: '#4F5330',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Property Cards */}
              <View style={{ gap: 12, marginBottom: 20 }}>
                {properties.map((property, idx) => {
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
                      style={{
                        backgroundColor: '#FFFDF8',
                        borderRadius: 20,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
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
                          marginBottom: 10,
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
                              width: 52,
                              height: 52,
                              borderRadius: 14,
                              backgroundColor: '#FAF5EB',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              overflow: 'hidden',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Image
                              source={getPropertyImage(property, idx)}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}
                              numberOfLines={1}
                            >
                              {property.name}
                            </Text>
                            <View
                              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
                            >
                              <View
                                style={{
                                  backgroundColor: '#FAF5EB',
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 9999,
                                  borderWidth: 1,
                                  borderColor: '#E5DDCD',
                                  marginRight: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    color: '#0C192B',
                                  }}
                                >
                                  {property.type || 'Coliving'}
                                </Text>
                              </View>
                              {property.city ? (
                                <Text
                                  style={{ fontSize: 12, color: '#657080', fontWeight: '500' }}
                                  numberOfLines={1}
                                >
                                  · {property.city}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                        <ChevronRight size={18} color="#657080" />
                      </View>

                      {/* Mini Stats Row */}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#657080',
                          marginBottom: 10,
                        }}
                      >
                        {totalFloors} floor{totalFloors === 1 ? '' : 's'} · {totalRooms} room
                        {totalRooms === 1 ? '' : 's'} · {totalBeds} bed{totalBeds === 1 ? '' : 's'}
                      </Text>

                      {/* Occupancy Progress Bar */}
                      <View
                        style={{
                          backgroundColor: '#FAF5EB',
                          height: 7,
                          borderRadius: 9999,
                          overflow: 'hidden',
                          marginBottom: 6,
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            backgroundColor: '#4F5330',
                            borderRadius: 9999,
                            width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                          }}
                        />
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                          {occupiedBeds} of {totalBeds} occupied ({occupancyRate}%)
                        </Text>
                        {property.isArchived ? (
                          <View
                            style={{
                              backgroundColor: '#FEF3C7',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                color: '#92400E',
                              }}
                            >
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
          </View>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PROPERTY DETAIL / FLOORS VIEW                                     */}
        {/* ========================================================================= */}
        {viewLevel === 'property_detail' && activeProperty && (
          <View style={{ flex: 1 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <TouchableOpacity
                  onPress={handleBack}
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
                    marginRight: 10,
                  }}
                  accessibilityLabel="Back"
                >
                  <ArrowLeft size={18} color="#0C192B" strokeWidth={2.3} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}
                    numberOfLines={1}
                  >
                    {activeProperty.name}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 1 }}>
                    {activeProperty.city || 'Property'} ·{' '}
                    {activeProperty.type
                      ? activeProperty.type.charAt(0).toUpperCase() + activeProperty.type.slice(1)
                      : 'Coliving'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowEditProperty(true)}
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
                  <Pencil size={15} color="#0C192B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Property Hero Card */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 20,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    width: 76,
                    height: 60,
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    marginRight: 12,
                  }}
                >
                  <Image
                    source={getPropertyImage(activeProperty)}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}
                      numberOfLines={1}
                    >
                      {activeProperty.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#EAF7EE',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: '#B2E7C3',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#0A6C50' }}>
                        Active
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 3 }}
                    numberOfLines={1}
                  >
                    {activeProperty.address ? `${activeProperty.address}, ` : ''}
                    {activeProperty.city || 'Hyderabad'}
                    {activeProperty.pincode ? `, ${activeProperty.pincode}` : ''}
                  </Text>
                </View>
              </View>

              {/* 4 Stat Boxes (Floors, Rooms, Beds, % Full) */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                    }}
                  >
                    Floors
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginTop: 2 }}>
                    {floors.length || activeProperty.stats?.totalFloors || 1}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                    }}
                  >
                    Rooms
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginTop: 2 }}>
                    {summary?.totalRooms ?? activeProperty.stats?.totalRooms ?? 0}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                    }}
                  >
                    Beds
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginTop: 2 }}>
                    {summary?.totalBeds ?? activeProperty.stats?.totalBeds ?? 0}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#4F5330',
                      textTransform: 'uppercase',
                    }}
                  >
                    % Full
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F5330', marginTop: 2 }}>
                    {summary?.occupancyRate ?? activeProperty.stats?.occupancyRate ?? 0}%
                  </Text>
                </View>
              </View>

              {/* UPI & Electricity strip */}
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSubMeterRoomNumber(undefined);
                    setShowSubMeterModal(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
                >
                  <Zap size={14} color="#00838F" style={{ marginRight: 6 }} />
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}
                    numberOfLines={1}
                  >
                    EB:{' '}
                    {activeProperty.electricityRatePaisePerUnit
                      ? `${formatINR(activeProperty.electricityRatePaisePerUnit)}/unit`
                      : '₹12/unit'}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#E0F7FA',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginLeft: 8,
                      borderWidth: 1,
                      borderColor: '#80DEEA',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#00838F' }}>
                      ⚡ View / Log EB
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: '#657080' }}
                  numberOfLines={1}
                >
                  UPI: {activeProperty.upiVpa || 'None'}
                </Text>
              </View>

              {/* Section Header: FLOORS */}
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
                  Floors ({floors.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddFloor(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FAF5EB',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Plus size={13} color="#4F5330" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F5330' }}>
                    Add floor
                  </Text>
                </TouchableOpacity>
              </View>

              {isLoadingMatrix ? (
                <View
                  style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <ActivityIndicator size="small" color="#4F5330" />
                  <Text style={{ fontSize: 12, color: '#657080', fontWeight: '600', marginTop: 8 }}>
                    Loading floors...
                  </Text>
                </View>
              ) : floors.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#FFFDF8',
                    borderRadius: 20,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={32} color="#4F5330" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B', marginTop: 8 }}>
                    No Floors Added Yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#657080',
                      textAlign: 'center',
                      marginTop: 4,
                      marginBottom: 14,
                    }}
                  >
                    Add your first floor to organize rooms and beds.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddFloor(true)}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#4F5330',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 9999,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                      Add First Floor
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10, marginBottom: 20 }}>
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
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderRadius: 18,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
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
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              backgroundColor: '#FAF5EB',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 10,
                            }}
                          >
                            <Layers size={18} color="#4F5330" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                              Floor {floor.floorNumber === 0 ? 'Ground (0)' : floor.floorNumber}
                              {floor.floorLabel ? ` · ${floor.floorLabel}` : ''}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#657080',
                                fontWeight: '500',
                                marginTop: 1,
                              }}
                            >
                              {roomsCount} room{roomsCount === 1 ? '' : 's'} · {totalFloorBeds} bed
                              {totalFloorBeds === 1 ? '' : 's'} · {occupiedFloorBeds} occupied
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => setFloorToEdit(floor)}
                            activeOpacity={0.7}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: '#FAF5EB',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Pencil size={13} color="#0C192B" />
                          </TouchableOpacity>
                          <ChevronRight size={18} color="#657080" />
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
        {/* VIEW 3: FLOOR ROOMS VIEW                                                  */}
        {/* ========================================================================= */}
        {viewLevel === 'floor_rooms' && activeFloor && activeProperty && (
          <View style={{ flex: 1 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <TouchableOpacity
                  onPress={handleBack}
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
                    marginRight: 10,
                  }}
                  accessibilityLabel="Back"
                >
                  <ArrowLeft size={18} color="#0C192B" strokeWidth={2.3} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}
                    numberOfLines={1}
                  >
                    Floor {activeFloor.floorNumber === 0 ? 'Ground' : activeFloor.floorNumber}
                    {activeFloor.floorLabel ? ` · ${activeFloor.floorLabel}` : ''}
                  </Text>
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {activeProperty.name} · {activeFloor.rooms.length} rooms
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setFloorToEdit(activeFloor)}
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
                  <Pencil size={15} color="#0C192B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {activeFloor.rooms.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#FFFDF8',
                    borderRadius: 20,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DoorOpen size={32} color="#4F5330" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B', marginTop: 8 }}>
                    No Rooms On This Floor
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#657080',
                      textAlign: 'center',
                      marginTop: 4,
                      marginBottom: 14,
                    }}
                  >
                    Add rooms with sharing type to auto-generate beds.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAddRoomDefaultFloor(activeFloor.floorNumber);
                      setShowAddRoom(true);
                    }}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#4F5330',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 9999,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                      Add Room
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10, marginBottom: 20 }}>
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
                        style={{
                          backgroundColor: '#FFFDF8',
                          borderRadius: 18,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.03,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                              Room {room.roomNumber}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: '#657080',
                                marginTop: 2,
                              }}
                            >
                              {occupiedBeds} of {totalBeds} beds ·{' '}
                              {formatINR(room.baseRentPaisePerBed)}/bed
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TouchableOpacity
                              onPress={e => {
                                e.stopPropagation?.();
                                setSubMeterRoomNumber(room.roomNumber);
                                setShowSubMeterModal(true);
                              }}
                              activeOpacity={0.7}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 7,
                                paddingVertical: 5,
                                borderRadius: 10,
                                backgroundColor: '#E0F7FA',
                                borderWidth: 1,
                                borderColor: '#80DEEA',
                              }}
                            >
                              <Zap size={11} color="#00838F" style={{ marginRight: 3 }} />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#00838F' }}>
                                EB
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setRoomToEdit(room)}
                              activeOpacity={0.7}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: '#FAF5EB',
                                borderWidth: 1,
                                borderColor: '#E5DDCD',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Pencil size={12} color="#0C192B" />
                            </TouchableOpacity>
                            <ChevronRight size={18} color="#657080" />
                          </View>
                        </View>

                        {/* Room Tags */}
                        {room.tags && room.tags.length > 0 && (
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 6,
                              paddingTop: 6,
                              borderTopWidth: 1,
                              borderTopColor: '#FAF5EB',
                            }}
                          >
                            {room.tags
                              .filter(
                                t =>
                                  !['single', 'double', 'triple'].includes(t.toLowerCase()) &&
                                  !t.toLowerCase().includes('sharing'),
                              )
                              .map((tag, idx) => {
                                const displayTag =
                                  tag.toLowerCase() === 'attached washroom' ? 'Washroom' : tag;
                                return (
                                  <View
                                    key={idx}
                                    style={{
                                      backgroundColor: '#FAF5EB',
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 9999,
                                      borderWidth: 1,
                                      borderColor: '#E5DDCD',
                                    }}
                                  >
                                    <Text
                                      style={{ fontSize: 10, fontWeight: '700', color: '#657080' }}
                                    >
                                      {displayTag}
                                    </Text>
                                  </View>
                                );
                              })}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Bottom Add Room Button */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#E5DDCD',
                backgroundColor: '#FAF5EB',
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setAddRoomDefaultFloor(activeFloor.floorNumber);
                  setShowAddRoom(true);
                }}
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Add room</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ROOM DETAIL / BEDS VIEW                                           */}
        {/* ========================================================================= */}
        {viewLevel === 'room_beds' && activeRoom && activeFloor && activeProperty && (
          <View style={{ flex: 1 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <TouchableOpacity
                  onPress={handleBack}
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
                    marginRight: 10,
                  }}
                  accessibilityLabel="Back"
                >
                  <ArrowLeft size={18} color="#0C192B" strokeWidth={2.3} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }}
                    numberOfLines={1}
                  >
                    Room {activeRoom.roomNumber}
                  </Text>
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 1 }}
                    numberOfLines={1}
                  >
                    Floor {activeFloor.floorNumber} · {activeProperty.name}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSubMeterRoomNumber(activeRoom.roomNumber);
                    setShowSubMeterModal(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 9999,
                    backgroundColor: '#E0F7FA',
                    borderWidth: 1,
                    borderColor: '#80DEEA',
                  }}
                >
                  <Zap size={13} color="#00838F" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#00838F' }}>EB Bill</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRoomToEdit(activeRoom)}
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
                  <Pencil size={15} color="#0C192B" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Tags Row */}
              {activeRoom.tags && activeRoom.tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {activeRoom.tags
                    .filter(
                      t =>
                        !['single', 'double', 'triple'].includes(t.toLowerCase()) &&
                        !t.toLowerCase().includes('sharing'),
                    )
                    .map((tag, idx) => {
                      const displayTag =
                        tag.toLowerCase() === 'attached washroom' ? 'Washroom' : tag;
                      return (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: '#FFFDF8',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 9999,
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#657080' }}>
                            {displayTag}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* 2 Stat Boxes */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                    }}
                  >
                    Rent per bed
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B', marginTop: 2 }}>
                    {formatINR(activeRoom.baseRentPaisePerBed)}/mo
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                    }}
                  >
                    Occupied
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#4F5330', marginTop: 2 }}>
                    {activeRoom.beds.filter(b => b.status === 'occupied').length} of{' '}
                    {activeRoom.beds.length}
                  </Text>
                </View>
              </View>

              {/* Section Header: BEDS */}
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
                  Beds ({activeRoom.beds.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddBed(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FAF5EB',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                  }}
                >
                  <Plus size={13} color="#4F5330" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F5330' }}>Add bed</Text>
                </TouchableOpacity>
              </View>

              {/* Bed Cards */}
              <View style={{ gap: 10, marginBottom: 20 }}>
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
                      style={{
                        backgroundColor: '#FFFDF8',
                        borderRadius: 18,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
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
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: isAvailable
                              ? '#DCFCE7'
                              : isOccupied
                                ? '#DBEAFE'
                                : '#FEF3C7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          <BedIcon
                            size={18}
                            color={isAvailable ? '#15803D' : isOccupied ? '#1D4ED8' : '#D97706'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                            Bed {bed.bedNumber}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              marginTop: 2,
                              color: isOccupied ? '#1D4ED8' : isAvailable ? '#15803D' : '#D97706',
                            }}
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

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {/* Status Pill */}
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 9999,
                            backgroundColor: isOccupied
                              ? '#DBEAFE'
                              : isAvailable
                                ? '#DCFCE7'
                                : '#FEF3C7',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              color: isOccupied ? '#1D4ED8' : isAvailable ? '#15803D' : '#D97706',
                            }}
                          >
                            {isAvailable ? 'Vacant' : isOccupied ? 'Occupied' : 'Maintenance'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setBedToEdit(bed)}
                          activeOpacity={0.7}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pencil size={12} color="#0C192B" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Edit Room & Delete Room Actions */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#E5DDCD',
                backgroundColor: '#FAF5EB',
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRoomToEdit(activeRoom)}
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Edit room</Text>
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
          existingFloors={floors.map(f => f.floorNumber)}
          defaultFloor={addRoomDefaultFloor}
          onSubmit={addRoomMutation.mutateAsync}
          isSubmitting={addRoomMutation.isPending}
        />

        {/* Edit Room Modal */}
        <EditRoomModal
          visible={!!roomToEdit}
          propertyId={activePropId}
          property={activeProperty || null}
          existingFloors={floors.map(f => f.floorNumber)}
          existingRooms={existingRooms}
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

        {/* Sub-meter Electricity Modal */}
        <SubMeterModal
          visible={showSubMeterModal}
          onClose={() => {
            setShowSubMeterModal(false);
            setSubMeterRoomNumber(undefined);
          }}
          property={activeProperty || null}
          properties={properties}
          initialRoomNumber={subMeterRoomNumber}
        />
      </View>
    </Modal>
  );
};
