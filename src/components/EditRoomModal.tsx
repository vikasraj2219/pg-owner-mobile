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
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  DoorOpen,
  DoorClosed,
  Layers,
  ChevronDown,
  BedDouble,
  Snowflake,
  ShowerHead,
  ArrowRight,
  Trash2,
  AlertTriangle,
  X,
  Plus,
  Minus,
  Check,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { IMatrixRoom, IRoom, IProperty } from '../types/api';
import { updateRoomApi, deleteRoomApi } from '../api/properties';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { RoomSummaryCard } from './RoomSummaryCard';
import { formatFloorLabel } from './AddRoomModal';
import { DecorativeWaveFooter } from './DecorativeWaveFooter';
import { SuccessActionModal } from './SuccessActionModal';
import { formatINR } from '../utils/currency';

interface EditRoomModalProps {
  visible: boolean;
  propertyId: string;
  property?: IProperty | null;
  existingFloors?: number[];
  existingRooms?: string[];
  room: IMatrixRoom | IRoom | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  visible,
  propertyId,
  property,
  existingFloors = [],
  existingRooms = [],
  room,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [roomNumber, setRoomNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState('1');
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [customFloorInput, setCustomFloorInput] = useState('');
  const [isEnteringCustomFloor, setIsEnteringCustomFloor] = useState(false);

  const [sharingType, setSharingType] = useState<number>(3);
  const [showCustomSharing, setShowCustomSharing] = useState(false);
  const [rentPerBed, setRentPerBed] = useState('7500');
  const [hasAC, setHasAC] = useState(true);
  const [hasWashroom, setHasWashroom] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOccupiedWarningModal, setShowOccupiedWarningModal] = useState(false);

  // Safely parse floor integer preserving 0 (Ground Floor)
  const parseFloorInt = (val: string, fallback = 1): number => {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
  };

  useEffect(() => {
    if (room && visible) {
      setRoomNumber(room.roomNumber || '');
      setFloorNumber((room.floorNumber ?? 1).toString());
      setSharingType(room.sharingType || 3);
      setShowCustomSharing((room.sharingType || 3) > 4);
      setRentPerBed(
        room.baseRentPaisePerBed ? (room.baseRentPaisePerBed / 100).toString() : '7500',
      );
      const tags = room.tags || [];
      setHasAC(tags.includes('AC'));
      setHasWashroom(tags.includes('Attached Washroom') || tags.includes('Washroom'));
      setShowFloorPicker(false);
      setShowDeleteConfirm(false);
      setShowOccupiedWarningModal(false);
    }
  }, [room, visible]);

  // Compute dynamic floors
  const dynamicFloors = useMemo(() => {
    const floorSet = new Set<number>();

    if (existingFloors && existingFloors.length > 0) {
      existingFloors.forEach(f => {
        if (typeof f === 'number' && !isNaN(f)) floorSet.add(f);
      });
    }

    existingRooms.forEach(r => {
      const clean = r.trim().toUpperCase();
      if (clean.startsWith('G')) {
        floorSet.add(0);
      } else {
        const match = clean.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 100) {
            floorSet.add(Math.floor(num / 100));
          } else if (num < 100) {
            floorSet.add(1);
          }
        }
      }
    });

    const totalFl = property?.stats?.totalFloors;
    if (typeof totalFl === 'number' && totalFl > 0) {
      for (let i = 1; i <= totalFl; i++) {
        floorSet.add(i);
      }
    }

    const cur = parseInt(floorNumber, 10);
    if (!isNaN(cur)) floorSet.add(cur);
    if (room && typeof room.floorNumber === 'number') floorSet.add(room.floorNumber);

    if (floorSet.size <= 1) {
      [0, 1, 2, 3].forEach(f => floorSet.add(f));
    }

    return Array.from(floorSet).sort((a, b) => a - b);
  }, [existingFloors, existingRooms, property?.stats?.totalFloors, floorNumber, room]);

  const getRoomCountForFloor = (fl: number) => {
    return existingRooms.filter(r => {
      const clean = r.trim().toUpperCase();
      if (fl === 0) return clean.startsWith('G');
      const match = clean.match(/^(\d+)/);
      if (!match) return false;
      const num = parseInt(match[1], 10);
      return Math.floor(num / 100) === fl;
    }).length;
  };

  if (!visible || !room) return null;

  const handleSave = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a room number.');
      return;
    }

    const floorInt = parseFloorInt(floorNumber, 1);

    const rentNumeric = parseFloat(rentPerBed);
    if (isNaN(rentNumeric) || rentNumeric < 0) {
      Alert.alert('Invalid Rent', 'Please enter a valid monthly rent per bed.');
      return;
    }

    const tags: string[] = [];
    if (hasAC) tags.push('AC');
    if (hasWashroom) tags.push('Washroom');

    setIsSaving(true);
    try {
      await updateRoomApi(propertyId, room._id, {
        roomNumber: roomNumber.trim(),
        floorNumber: floorInt,
        sharingType,
        baseRentPaisePerBed: Math.round(rentNumeric * 100),
        tags,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      setSavedSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update room');
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    const occupiedCount =
      'beds' in room && Array.isArray(room.beds)
        ? room.beds.filter(b => b.status === 'occupied').length
        : 0;

    if (occupiedCount > 0) {
      setShowOccupiedWarningModal(true);
      return;
    }

    setShowDeleteConfirm(true);
  };

  const executeDeleteRoom = async () => {
    setIsDeleting(true);
    try {
      await deleteRoomApi(propertyId, room._id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['propertyMatrix', propertyId] }),
        queryClient.invalidateQueries({ queryKey: ['matrix'] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);

      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete room');
      Alert.alert('Delete Blocked', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const rentNumeric = parseFloat(rentPerBed.replace(/,/g, '')) || 0;
  const occupiedCount =
    'beds' in room && Array.isArray(room.beds)
      ? room.beds.filter(b => b.status === 'occupied').length
      : 0;

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
        {/* Header matching Reference */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
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
            }}
          >
            <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}
            >
              Edit Room {room.roomNumber}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
              Update room details and bed capacity
            </Text>
          </View>

          {/* Small Delete Button at Top Header */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeleteClick}
            disabled={isDeleting}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FFF1F2',
              borderWidth: 1,
              borderColor: '#FECDD3',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Delete room"
          >
            <Trash2 size={18} color="#BE123C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FAF5EB' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Room Preview Card */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 20,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: '#FAF7F2',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <DoorOpen size={24} color="#4F5330" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                Room {roomNumber || room.roomNumber}
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                numberOfLines={1}
              >
                {formatFloorLabel(parseFloorInt(floorNumber, 1))} •{' '}
                {property?.name || 'PG Property'}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#E8F5E9',
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>Active</Text>
            </View>
          </View>

          {/* Floor & Room Number Row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Floor Dropdown Trigger */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
                Floor
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsEnteringCustomFloor(false);
                  setCustomFloorInput('');
                  setShowFloorPicker(true);
                }}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Layers size={18} color="#657080" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#0C192B',
                  }}
                  numberOfLines={1}
                >
                  {formatFloorLabel(parseFloorInt(floorNumber, 1))}
                </Text>
                <ChevronDown size={18} color="#657080" />
              </TouchableOpacity>
            </View>

            {/* Room Number Input */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
                Room Number
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  height: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <DoorClosed size={18} color="#657080" style={{ marginRight: 8 }} />
                <TextInput
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  placeholder="e.g. 101"
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#0C192B',
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>
          </View>

          {/* Sharing Type (Beds per Room) */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
              Sharing Type (Beds per Room)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BedDouble size={20} color="#657080" />
              </View>

              {[1, 2, 3, 4].map(count => {
                const isSelected = sharingType === count && !showCustomSharing;
                return (
                  <TouchableOpacity
                    key={count}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSharingType(count);
                      setShowCustomSharing(false);
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: '#0C192B',
                      }}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowCustomSharing(true);
                  if (sharingType <= 4) setSharingType(5);
                }}
                style={{
                  paddingHorizontal: 12,
                  height: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: showCustomSharing ? '#19D3E6' : '#FFFDF8',
                  borderColor: showCustomSharing ? '#19D3E6' : '#E5DDCD',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: '#0C192B',
                  }}
                >
                  {showCustomSharing && sharingType > 4 ? `${sharingType} Beds` : '+ Custom'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Sharing Stepper */}
            {showCustomSharing && (
              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFDF8',
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                  Custom Bed Capacity:
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.max(1, prev - 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={15} color="#0C192B" />
                  </TouchableOpacity>
                  <TextInput
                    value={sharingType.toString()}
                    onChangeText={txt => {
                      const n = parseInt(txt.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(n)) setSharingType(Math.min(20, Math.max(1, n)));
                      else if (txt === '') setSharingType(1);
                    }}
                    keyboardType="number-pad"
                    style={{
                      width: 48,
                      height: 32,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 8,
                      textAlign: 'center',
                      fontWeight: '800',
                      color: '#0C192B',
                      fontSize: 14,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.min(20, prev + 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: '#FAF5EB',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={15} color="#0C192B" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Amenities Toggles */}
          <View style={{ marginBottom: 18, gap: 10 }}>
            {/* AC Toggle */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#E6FBFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Snowflake size={18} color="#0799AA" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                    Air Conditioning
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 1 }}>
                    Room has AC
                  </Text>
                </View>
              </View>
              <Switch
                value={hasAC}
                onValueChange={setHasAC}
                trackColor={{ false: '#CBD5E1', true: '#19D3E6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Attached Washroom Toggle */}
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#E6FBFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <ShowerHead size={18} color="#0799AA" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                    Attached Washroom
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 1 }}>
                    Room has attached bathroom
                  </Text>
                </View>
              </View>
              <Switch
                value={hasWashroom}
                onValueChange={setHasWashroom}
                trackColor={{ false: '#CBD5E1', true: '#19D3E6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Rent Per Bed Input */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
              Rent Per Bed
            </Text>
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 16,
                paddingHorizontal: 14,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={rentPerBed}
                onChangeText={setRentPerBed}
                placeholder="7500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>₹ / month</Text>
            </View>
          </View>

          {/* Room Summary Card in place of Total Room Potential matching Reference */}
          <RoomSummaryCard bedsCount={sharingType} rentPerBedNumeric={rentNumeric} />
        </ScrollView>

        {/* Primary Save Room Changes CTA Button */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 0,
            borderTopWidth: 1,
            borderTopColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={isSaving}
            style={{
              width: '100%',
              backgroundColor: '#4F5330',
              height: 52,
              borderRadius: 9999,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#4F5330',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  Save Room Changes
                </Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <DecorativeWaveFooter
            height={48}
            style={{ marginTop: 10, marginHorizontal: -20, marginBottom: 0 }}
          />
        </View>

        {/* Floor Selection Dropdown Sheet Modal */}
        <Modal
          visible={showFloorPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFloorPicker(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 25, 43, 0.65)',
              justifyContent: 'flex-end',
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowFloorPicker(false)}
              style={{ flex: 1 }}
            />
            <View
              style={{
                backgroundColor: '#FAF5EB',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: '#E5DDCD',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: Platform.OS === 'ios' ? 36 : 24,
                maxHeight: '75%',
              }}
            >
              {/* Drag Indicator */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#D1C7B7',
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />

              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                    Select Floor
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                    Choose an existing floor or add a new one
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowFloorPicker(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                <View style={{ gap: 8, paddingBottom: 12 }}>
                  {dynamicFloors.map(fl => {
                    const isSelected = parseFloorInt(floorNumber, 1) === fl;
                    const roomCount = getRoomCountForFloor(fl);
                    return (
                      <TouchableOpacity
                        key={fl}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFloorNumber(String(fl));
                          setShowFloorPicker(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          borderRadius: 16,
                          backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                          borderWidth: 1,
                          borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                        }}
                      >
                        <Layers
                          size={18}
                          color={isSelected ? '#0C192B' : '#4F5330'}
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '800',
                              color: '#0C192B',
                            }}
                          >
                            {formatFloorLabel(fl)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: isSelected ? '#0C192B' : '#657080',
                              marginTop: 2,
                            }}
                          >
                            {roomCount > 0
                              ? `${roomCount} room${roomCount > 1 ? 's' : ''} on this floor`
                              : 'No other rooms'}
                          </Text>
                        </View>
                        {isSelected && (
                          <View
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              backgroundColor: '#0C192B',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={15} color="#19D3E6" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add Next Floor or Custom Floor Option */}
                <View
                  style={{
                    marginTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#E5DDCD',
                    paddingTop: 14,
                  }}
                >
                  {!isEnteringCustomFloor ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {(() => {
                        const maxFloor = dynamicFloors.length > 0 ? Math.max(...dynamicFloors) : 0;
                        const nextFloor = maxFloor + 1;
                        return (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              setFloorNumber(String(nextFloor));
                              setShowFloorPicker(false);
                            }}
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              borderRadius: 14,
                              backgroundColor: '#FFFDF8',
                              borderWidth: 1,
                              borderColor: '#4F5330',
                            }}
                          >
                            <Plus size={16} color="#4F5330" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F5330' }}>
                              Add {formatFloorLabel(nextFloor)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setIsEnteringCustomFloor(true)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                          backgroundColor: '#FFFDF8',
                          borderWidth: 1,
                          borderColor: '#E5DDCD',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                          Custom #
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: '#FFFDF8',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#E5DDCD',
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#0C192B',
                          marginBottom: 8,
                        }}
                      >
                        Enter Custom Floor Number
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                          value={customFloorInput}
                          onChangeText={setCustomFloorInput}
                          placeholder="e.g. 5, 6, 0"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          autoFocus
                          style={{
                            flex: 1,
                            height: 44,
                            backgroundColor: '#FAF5EB',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            paddingHorizontal: 12,
                            fontSize: 15,
                            fontWeight: '700',
                            color: '#0C192B',
                          }}
                        />
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            const parsed = parseInt(customFloorInput.trim(), 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                              setFloorNumber(String(parsed));
                              setShowFloorPicker(false);
                            }
                          }}
                          style={{
                            backgroundColor: '#4F5330',
                            paddingHorizontal: 16,
                            height: 44,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                            Select
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modern Modal when Room Cannot Be Deleted Due to Active Tenants */}
        <Modal
          visible={showOccupiedWarningModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOccupiedWarningModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 25, 43, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                padding: 24,
                width: '100%',
                maxWidth: 380,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              {/* Header Icon & Close */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={24} color="#D97706" strokeWidth={2.3} />
                </View>

                <TouchableOpacity
                  onPress={() => setShowOccupiedWarningModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                  <X size={16} color="#657080" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: '#0C192B',
                  letterSpacing: -0.3,
                  marginBottom: 8,
                }}
              >
                Cannot Delete Room {room.roomNumber}
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#4B5563',
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#0C192B' }}>
                  {occupiedCount} tenant{occupiedCount === 1 ? ' is' : 's are'}
                </Text>{' '}
                currently staying in this room.
              </Text>

              {/* Guidance Box */}
              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '600',
                    color: '#92400E',
                    lineHeight: 18,
                  }}
                >
                  Please move or check out all tenants before deleting this room.
                </Text>
              </View>

              {/* Single Primary Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowOccupiedWarningModal(false)}
                style={{
                  backgroundColor: '#4F5330',
                  height: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                  Understood
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Confirm Delete Modal */}
        <ConfirmDeleteModal
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={executeDeleteRoom}
          title={`Delete Room ${room.roomNumber}?`}
          message="Its empty beds will be removed permanently. This action cannot be undone."
          confirmLabel="Delete Room"
          isLoading={isDeleting}
        />

        {/* Modern In-App Success Modal for Room Update */}
        <SuccessActionModal
          visible={savedSuccess}
          onClose={() => {
            setSavedSuccess(false);
            onSuccess?.();
            onClose();
          }}
          title="Room Updated Successfully!"
          message={`Room ${roomNumber} has been updated successfully.`}
          highlightCard={{
            icon: <DoorClosed size={16} color="#15803D" />,
            title: `Room ${roomNumber} • Floor ${parseFloorInt(floorNumber)}`,
            subtitle: `${sharingType} Share · ${formatINR(Math.round(rentNumeric * 100))}/bed`,
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
