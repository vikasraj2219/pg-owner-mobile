import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Check, BedDouble } from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useMatrix } from '../../src/hooks/useMatrix';
import { IMatrixBed, IMatrixRoom } from '../../src/types/api';
import { formatINR } from '../../src/utils/currency';

interface FlatVacantBed {
  bed: IMatrixBed;
  room: IMatrixRoom;
}

export default function PickVacantBedScreen() {
  const router = useRouter();
  const { selectedPropertyId } = useProperties();
  const { data: matrixData, isLoading } = useMatrix(selectedPropertyId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedBedItem, setSelectedBedItem] = useState<FlatVacantBed | null>(null);

  // Extract all rooms from floors
  const rooms: IMatrixRoom[] = useMemo(() => {
    if (!matrixData?.floors) return [];
    return matrixData.floors.flatMap(f => f.rooms);
  }, [matrixData]);

  // Available floors
  const availableFloors = useMemo(() => {
    const floorsSet = new Set<number>();
    rooms.forEach((r: IMatrixRoom) => {
      if (r.floorNumber !== undefined) floorsSet.add(r.floorNumber);
    });
    return Array.from(floorsSet).sort((a, b) => a - b);
  }, [rooms]);

  // Group rooms with vacant beds
  const filteredRooms = useMemo(() => {
    return rooms
      .map((room: IMatrixRoom) => {
        // Only vacant beds (available)
        let vacantBeds = (room.beds || []).filter((b: IMatrixBed) => b.status === 'available');

        // Apply floor filter
        if (selectedFloor !== 'all' && room.floorNumber !== selectedFloor) {
          vacantBeds = [];
        }

        // Apply search query (matches room number, floor number, bed number)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesRoom =
            room.roomNumber.toLowerCase().includes(q) ||
            `floor ${room.floorNumber}`.includes(q) ||
            `room ${room.roomNumber}`.includes(q);

          if (!matchesRoom) {
            vacantBeds = vacantBeds.filter((b: IMatrixBed) =>
              b.bedNumber.toLowerCase().includes(q),
            );
          }
        }

        return {
          room,
          vacantBeds,
        };
      })
      .filter(
        (item: { room: IMatrixRoom; vacantBeds: IMatrixBed[] }) => item.vacantBeds.length > 0,
      );
  }, [rooms, selectedFloor, searchQuery]);

  const sharingLabel = (sharingType?: number) => {
    if (!sharingType || sharingType === 1) return 'Single';
    if (sharingType === 2) return 'Double';
    if (sharingType === 3) return 'Triple';
    if (sharingType === 4) return 'Four-sharing';
    return `${sharingType}-sharing`;
  };

  const handleContinue = () => {
    if (!selectedBedItem) return;
    const { bed, room } = selectedBedItem;

    router.push({
      pathname: `/checkin/${bed._id}` as any,
      params: {
        bedId: bed._id,
        bedNumber: bed.bedNumber,
        roomNumber: room.roomNumber,
        floorNumber: String(room.floorNumber),
        sharingType: String(room.sharingType || 2),
        baseRentPaise: String(room.baseRentPaisePerBed || 0),
        propertyId: selectedPropertyId || '',
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
          backgroundColor: '#FAF5EB',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
          </TouchableOpacity>
          <View>
            <Text
              style={{ fontSize: 20, fontWeight: '800', color: '#0C192B', letterSpacing: -0.3 }}
            >
              Add tenant
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 2 }}>
              Step 1 of 2 · Pick a vacant bed
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFDF8',
            borderWidth: 1,
            borderColor: '#E5DDCD',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 12,
          }}
        >
          <Search size={18} color="#657080" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, phone or bed"
            placeholderTextColor="#8C939D"
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              fontWeight: '500',
              color: '#0C192B',
            }}
          />
        </View>

        {/* Floors Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            flexDirection: 'row',
            marginTop: 12,
            marginHorizontal: -20,
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingRight: 30 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedFloor('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
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
              All floors
            </Text>
          </TouchableOpacity>

          {availableFloors.map(floorNum => (
            <TouchableOpacity
              key={floorNum}
              onPress={() => setSelectedFloor(floorNum)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9999,
                borderWidth: 1,
                marginRight: 8,
                backgroundColor: selectedFloor === floorNum ? '#19D3E6' : '#FFFDF8',
                borderColor: selectedFloor === floorNum ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: selectedFloor === floorNum ? '800' : '600',
                  color: selectedFloor === floorNum ? '#0C192B' : '#657080',
                }}
              >
                Floor {floorNum}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Vacant Beds List Grouped by Room */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F5330" />
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080', marginTop: 8 }}>
            Checking vacant beds...
          </Text>
        </View>
      ) : filteredRooms.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <BedDouble size={48} color="#CBD5E1" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#0C192B',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            No vacant beds available
          </Text>
          <Text style={{ fontSize: 12, color: '#657080', textAlign: 'center', marginTop: 4 }}>
            All beds in this PG are currently occupied or under maintenance.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {filteredRooms.map(({ room, vacantBeds }) => (
            <View key={room._id} style={{ marginBottom: 24 }}>
              {/* Room Header */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#4F5330',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                ROOM {room.roomNumber} · FLOOR {room.floorNumber}
              </Text>

              {/* Beds Grid / Row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                {vacantBeds.map(bed => {
                  const isSelected = selectedBedItem?.bed._id === bed._id;
                  const rent = room.baseRentPaisePerBed || 0;

                  return (
                    <View
                      key={bed._id}
                      style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}
                    >
                      <TouchableOpacity
                        onPress={() => setSelectedBedItem({ bed, room })}
                        activeOpacity={0.8}
                        style={{
                          padding: 14,
                          borderRadius: 16,
                          borderWidth: isSelected ? 2 : 1,
                          borderStyle: isSelected ? 'solid' : 'dashed',
                          borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFDF8',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                            {bed.bedNumber}
                          </Text>
                          {isSelected && <Check size={18} color="#4F5330" strokeWidth={3} />}
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#657080' }}>
                          {sharingLabel(room.sharingType)} · {formatINR(rent)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Sticky Bottom Bar */}
      {selectedBedItem && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFDF8',
            borderTopWidth: 1,
            borderTopColor: '#E5DDCD',
            padding: 16,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '700',
              color: '#0C192B',
              marginBottom: 8,
            }}
          >
            Bed {selectedBedItem.bed.bedNumber} selected ·{' '}
            {formatINR(selectedBedItem.room.baseRentPaisePerBed || 0)} a month
          </Text>
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              width: '100%',
              backgroundColor: '#4F5330',
              paddingVertical: 14,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
              Continue to check-in
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
