import React, { useState, useMemo, useEffect } from 'react';
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
  Home,
  Layers,
  ChevronDown,
  DoorClosed,
  BedDouble,
  Snowflake,
  ShowerHead,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Plus,
  Minus,
  Check,
  X,
} from 'lucide-react-native';
import { IProperty } from '../types/api';
import { getApiErrorMessage } from '../utils/validation';
import { formatINR } from '../utils/currency';
import { RoomSummaryCard } from './RoomSummaryCard';
import { DecorativeWaveFooter } from './DecorativeWaveFooter';
import { SuccessActionModal } from './SuccessActionModal';

interface AddRoomModalProps {
  visible: boolean;
  onClose: () => void;
  property: IProperty | null;
  existingRooms?: string[];
  existingFloors?: number[];
  defaultFloor?: number;
  onSubmit: (payload: {
    floorNumber: number;
    roomNumber: string;
    sharingType: number;
    baseRentPaisePerBed: number;
    tags: string[];
  }) => Promise<unknown>;
  isSubmitting: boolean;
}

/**
 * Formats floor index into readable title (e.g. 0 -> "Ground Floor", 1 -> "1st Floor")
 */
export function formatFloorLabel(floor: number): string {
  if (floor === 0) return 'Ground Floor';
  if (floor < 0) return `Basement ${Math.abs(floor)}`;
  const j = floor % 10;
  const k = floor % 100;
  if (j === 1 && k !== 11) return `${floor}st Floor`;
  if (j === 2 && k !== 12) return `${floor}nd Floor`;
  if (j === 3 && k !== 13) return `${floor}rd Floor`;
  return `${floor}th Floor`;
}

/**
 * Finds the next unused room number for a given floor
 */
function getNextAvailableRoomNumber(floor: number, existing: string[]): string {
  const normalizedSet = new Set(existing.map(r => r.toLowerCase().trim()));

  if (floor === 0) {
    // Ground floor: G01, G02, ...
    for (let i = 1; i <= 99; i++) {
      const candidate = i < 10 ? `G0${i}` : `G${i}`;
      if (!normalizedSet.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  // Standard floors (Floor 1 -> 101, 102... Floor 2 -> 201, 202...)
  const base = floor * 100;
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base + i}`;
    if (!normalizedSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${floor}01`;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  visible,
  onClose,
  property,
  existingRooms = [],
  existingFloors = [],
  defaultFloor = 1,
  onSubmit,
  isSubmitting,
}) => {
  const [floorNumber, setFloorNumber] = useState(defaultFloor.toString());
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [customFloorInput, setCustomFloorInput] = useState('');
  const [isEnteringCustomFloor, setIsEnteringCustomFloor] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [sharingType, setSharingType] = useState<number>(3);
  const [showCustomSharing, setShowCustomSharing] = useState(false);
  const [hasAC, setHasAC] = useState(true);
  const [hasWashroom, setHasWashroom] = useState(true);
  const [rentPerBed, setRentPerBed] = useState('7500');
  const [createdRoomSuccess, setCreatedRoomSuccess] = useState<{
    roomNumber: string;
    floorNumber: number;
    sharingType: number;
    rent: string;
  } | null>(null);

  // Compute dynamic floors available in this property
  const dynamicFloors = useMemo(() => {
    const floorSet = new Set<number>();

    // Add explicitly provided existing floors
    if (existingFloors && existingFloors.length > 0) {
      existingFloors.forEach(f => {
        if (typeof f === 'number' && !isNaN(f)) floorSet.add(f);
      });
    }

    // Invert/parse from existing rooms (e.g. "G01" -> 0, "101" -> 1, "205" -> 2)
    existingRooms.forEach(room => {
      const clean = room.trim().toUpperCase();
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

    // Total floors if declared on property
    const totalFl = property?.stats?.totalFloors;
    if (typeof totalFl === 'number' && totalFl > 0) {
      for (let i = 1; i <= totalFl; i++) {
        floorSet.add(i);
      }
    }

    // Always include current floor & default floor
    const cur = parseInt(floorNumber, 10);
    if (!isNaN(cur)) floorSet.add(cur);
    if (typeof defaultFloor === 'number') floorSet.add(defaultFloor);

    // If still empty or minimal, supply standard starter floors [0, 1, 2, 3]
    if (floorSet.size <= 1) {
      [0, 1, 2, 3].forEach(f => floorSet.add(f));
    }

    return Array.from(floorSet).sort((a, b) => a - b);
  }, [existingFloors, existingRooms, property?.stats?.totalFloors, floorNumber, defaultFloor]);

  // Count existing rooms per floor for descriptive display
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

  // Safely parse floor integer preserving 0 (Ground Floor)
  const parseFloorInt = (val: string, fallback = 1): number => {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
  };

  // Automatically suggest next available room number whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      const parsed = parseInt(floorNumber, 10);
      const floorInt = !isNaN(parsed)
        ? parsed
        : typeof defaultFloor === 'number'
          ? defaultFloor
          : 1;
      setFloorNumber(floorInt.toString());
      const suggested = getNextAvailableRoomNumber(floorInt, existingRooms);
      setRoomNumber(suggested);
    }
  }, [visible, defaultFloor, existingRooms]);

  // Handle floor number change and automatically recalculate suggested room number
  const handleFloorChange = (newFloorText: string) => {
    setFloorNumber(newFloorText);
    const parsedFloor = parseInt(newFloorText, 10);
    if (!isNaN(parsedFloor)) {
      const suggested = getNextAvailableRoomNumber(parsedFloor, existingRooms);
      setRoomNumber(suggested);
    }
  };

  // Check if current entered room number already exists in this property
  const isDuplicateRoom = useMemo(() => {
    if (!roomNumber.trim()) return false;
    return existingRooms.some(r => r.toLowerCase().trim() === roomNumber.toLowerCase().trim());
  }, [roomNumber, existingRooms]);

  // Suggested unique room number if duplicate
  const suggestedAlternative = useMemo(() => {
    const floorInt = parseInt(floorNumber, 10);
    return getNextAvailableRoomNumber(isNaN(floorInt) ? 1 : floorInt, existingRooms);
  }, [floorNumber, existingRooms]);

  // Generate preview of bed labels
  const bedLabels = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cleanRoom = roomNumber.trim() || '101';
    const count = Math.min(Math.max(1, sharingType), 20);
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(`${cleanRoom}-${letters[i]}`);
    }
    return result;
  }, [roomNumber, sharingType]);

  const rentNumeric = parseFloat(rentPerBed.replace(/,/g, '')) || 0;

  const handleCreate = async () => {
    const floor = parseInt(floorNumber, 10);
    if (isNaN(floor)) {
      Alert.alert(
        'Required Field',
        'Please enter a valid floor number (e.g. 0 for Ground, 1, 2...).',
      );
      return;
    }
    if (!roomNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a room number.');
      return;
    }
    if (isDuplicateRoom) {
      Alert.alert(
        'Room Already Exists',
        `Room "${roomNumber.trim()}" already exists in ${property?.name || 'this property'}. Please enter a unique room number (e.g. "${suggestedAlternative}").`,
      );
      return;
    }
    if (rentNumeric <= 0) {
      Alert.alert('Required Field', 'Please enter a valid monthly rent per bed.');
      return;
    }

    const tags: string[] = [];
    if (hasAC) tags.push('AC');
    if (hasWashroom) tags.push('Washroom');

    try {
      await onSubmit({
        floorNumber: floor,
        roomNumber: roomNumber.trim(),
        sharingType,
        baseRentPaisePerBed: Math.round(rentNumeric * 100),
        tags,
      });

      setCreatedRoomSuccess({
        roomNumber: roomNumber.trim(),
        floorNumber: floor,
        sharingType,
        rent: formatINR(Math.round(rentNumeric * 100)),
      });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      Alert.alert('Room Creation Failed', message);
    }
  };

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
        {/* Header matching Right Screen */}
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
              Add Room
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
              Add a new room to this property
            </Text>
          </View>

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Home size={20} color="#4F5330" />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FAF5EB' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Info Card matching Right Screen */}
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
              <Home size={24} color="#4F5330" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                {property?.name || 'My PG Property'}
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}
                numberOfLines={1}
              >
                {property?.city
                  ? `${property.city}, ${property.pincode || '500081'}`
                  : property?.address || 'Hyderabad, 500081'}
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

          {/* Floor & Room Number Row matching Right Screen */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Floor Selection Dropdown Trigger */}
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
                  borderColor: isDuplicateRoom ? '#BE123C' : '#E5DDCD',
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

          {/* Duplicate Room Warning & Auto-suggestion */}
          {isDuplicateRoom && (
            <View
              style={{
                backgroundColor: '#FFF1F2',
                borderWidth: 1,
                borderColor: '#FECDD3',
                borderRadius: 16,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <AlertCircle size={16} color="#BE123C" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C', marginLeft: 6 }}>
                  Room &quot;{roomNumber.trim()}&quot; already exists in this property!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRoomNumber(suggestedAlternative)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  alignSelf: 'flex-start',
                  marginTop: 4,
                }}
              >
                <Sparkles size={14} color="#4F5330" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F5330', marginLeft: 6 }}>
                  Use next available: Room {suggestedAlternative}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sharing Type (Beds per Room) matching Right Screen */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B', marginBottom: 8 }}>
              Sharing Type (Beds per Room)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Bed Icon Chip */}
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

              {[2, 3, 4].map(count => {
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
                        color: isSelected ? '#0C192B' : '#0C192B',
                      }}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* + Custom Chip */}
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
                    color: showCustomSharing ? '#0C192B' : '#0C192B',
                  }}
                >
                  {showCustomSharing && sharingType > 4 ? `${sharingType} Beds` : '+ Custom'}
                </Text>
              </TouchableOpacity>
            </View>

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
                  Custom sharing capacity:
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.max(1, prev - 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#FAF7F2',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={15} color="#4F5330" />
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
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 8,
                      textAlign: 'center',
                      fontWeight: '800',
                      color: '#0C192B',
                      paddingVertical: 0,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setSharingType(prev => Math.min(20, prev + 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#FAF7F2',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={15} color="#4F5330" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Room Amenities / Features Switches matching Right Screen */}
          {/* Card 1: Air Conditioning */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#D1F4F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Snowflake size={20} color="#0799AA" />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  Air Conditioning
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  Room has AC
                </Text>
              </View>
            </View>
            <Switch
              value={hasAC}
              onValueChange={setHasAC}
              trackColor={{ false: '#E2E8F0', true: '#19D3E6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Card 2: Attached Washroom */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#D1F4F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <ShowerHead size={20} color="#0799AA" />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C192B' }}>
                  Attached Washroom
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
                  Room has attached bathroom
                </Text>
              </View>
            </View>
            <Switch
              value={hasWashroom}
              onValueChange={setHasWashroom}
              trackColor={{ false: '#E2E8F0', true: '#19D3E6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Rent Per Bed */}
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
                paddingHorizontal: 16,
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
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#0C192B',
                  paddingVertical: 0,
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>₹ / month</Text>
            </View>
          </View>

          {/* Room Summary Card matching Reference */}
          <RoomSummaryCard bedsCount={sharingType} rentPerBedNumeric={rentNumeric} />

          {/* Generated Beds Preview Pills */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 18,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <BedDouble size={16} color="#0D9488" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0C192B' }}>
                This will create {sharingType} {sharingType === 1 ? 'bed' : 'beds'}:
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {bedLabels.map(label => (
                <View
                  key={label}
                  style={{
                    backgroundColor: '#D1F4F9',
                    borderWidth: 1,
                    borderColor: '#A5F3FC',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0799AA' }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Primary Create Room & Beds CTA Button matching Right Screen */}
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
            onPress={handleCreate}
            disabled={isSubmitting || isDuplicateRoom}
            style={{
              width: '100%',
              backgroundColor: isDuplicateRoom ? '#CBD5E1' : '#4F5330',
              height: 52,
              borderRadius: 9999,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#4F5330',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDuplicateRoom ? 0 : 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={{
                    color: isDuplicateRoom ? '#64748B' : '#FFFFFF',
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  Create Room & Beds
                </Text>
                <ArrowRight
                  size={18}
                  color={isDuplicateRoom ? '#64748B' : '#FFFFFF'}
                  strokeWidth={2.5}
                  style={{ marginLeft: 8 }}
                />
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
                          handleFloorChange(String(fl));
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
                              ? `${roomCount} room${roomCount > 1 ? 's' : ''} in floor`
                              : 'No rooms yet'}
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
                      {/* Quick Add Next Floor button */}
                      {(() => {
                        const maxFloor = dynamicFloors.length > 0 ? Math.max(...dynamicFloors) : 0;
                        const nextFloor = maxFloor + 1;
                        return (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              handleFloorChange(String(nextFloor));
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

                      {/* Custom Floor Number Button */}
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
                              handleFloorChange(String(parsed));
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

        {/* Modern In-App Success Modal for Room Creation */}
        <SuccessActionModal
          visible={!!createdRoomSuccess}
          onClose={() => {
            const floor = createdRoomSuccess?.floorNumber ?? 1;
            const nextSuggested = getNextAvailableRoomNumber(floor, [
              ...existingRooms,
              createdRoomSuccess?.roomNumber ?? '',
            ]);
            setRoomNumber(nextSuggested);
            setCreatedRoomSuccess(null);
            onClose();
          }}
          title="Room Created Successfully!"
          message={`Room ${createdRoomSuccess?.roomNumber} with ${createdRoomSuccess?.sharingType} bed(s) has been added to Floor ${createdRoomSuccess?.floorNumber} and is ready for tenant check-in.`}
          highlightCard={{
            icon: <DoorClosed size={16} color="#15803D" />,
            title: `Room ${createdRoomSuccess?.roomNumber} • Floor ${createdRoomSuccess?.floorNumber}`,
            subtitle: `${createdRoomSuccess?.sharingType} Share · ${createdRoomSuccess?.rent}/bed`,
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
