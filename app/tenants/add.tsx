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
import { ChevronLeft, Search, Check, ChevronRight, BedDouble } from 'lucide-react-native';
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
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1 -ml-2 mr-2"
          >
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-slate-900">Add tenant</Text>
            <Text className="text-xs font-semibold text-slate-500">
              Step 1 of 2 · Pick a vacant bed
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 mt-3">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, phone or bed"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2.5 text-sm font-medium text-slate-900"
          />
        </View>

        {/* Floors Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mt-3 -mx-5 px-5"
          contentContainerStyle={{ paddingRight: 30 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedFloor('all')}
            className={`px-4 py-2 rounded-full border mr-2 ${
              selectedFloor === 'all'
                ? 'bg-[#0B6645] border-[#0B6645]'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFloor === 'all' ? 'text-white' : 'text-slate-700'
              }`}
            >
              All floors
            </Text>
          </TouchableOpacity>

          {availableFloors.map(floorNum => (
            <TouchableOpacity
              key={floorNum}
              onPress={() => setSelectedFloor(floorNum)}
              className={`px-4 py-2 rounded-full border mr-2 ${
                selectedFloor === floorNum
                  ? 'bg-[#0B6645] border-[#0B6645]'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedFloor === floorNum ? 'text-white' : 'text-slate-700'
                }`}
              >
                Floor {floorNum}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Vacant Beds List Grouped by Room */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0B6645" />
          <Text className="text-xs font-medium text-slate-400 mt-2">Checking vacant beds...</Text>
        </View>
      ) : filteredRooms.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <BedDouble size={48} color="#CBD5E1" />
          <Text className="text-base font-bold text-slate-800 text-center mt-3">
            No vacant beds available
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            All beds in this PG are currently occupied or under maintenance.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
          {filteredRooms.map(({ room, vacantBeds }) => (
            <View key={room._id} className="mb-6">
              {/* Room Header */}
              <Text className="text-xs font-black text-[#0B6645] uppercase tracking-wider mb-2.5">
                ROOM {room.roomNumber} · FLOOR {room.floorNumber}
              </Text>

              {/* Beds Grid / Row */}
              <View className="flex-row flex-wrap -mx-1.5">
                {vacantBeds.map(bed => {
                  const isSelected = selectedBedItem?.bed._id === bed._id;
                  const rent = room.baseRentPaisePerBed || 0;

                  return (
                    <View key={bed._id} className="w-1/2 px-1.5 mb-3">
                      <TouchableOpacity
                        onPress={() => setSelectedBedItem({ bed, room })}
                        activeOpacity={0.8}
                        className={`p-3.5 rounded-2xl border ${
                          isSelected
                            ? 'bg-[#F0FDF4] border-[#0B6645] border-2 shadow-sm'
                            : 'bg-white border-dashed border-teal-300'
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-black text-slate-900">
                            {bed.bedNumber}
                          </Text>
                          {isSelected && <Check size={18} color="#0B6645" strokeWidth={3} />}
                        </View>
                        <Text className="text-xs font-semibold text-slate-600">
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
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-2xl elevation-10">
          <Text className="text-center text-xs font-bold text-slate-700 mb-2">
            Bed {selectedBedItem.bed.bedNumber} selected ·{' '}
            {formatINR(selectedBedItem.room.baseRentPaisePerBed || 0)} a month
          </Text>
          <TouchableOpacity
            onPress={handleContinue}
            className="w-full bg-[#0B6645] py-3.5 rounded-full items-center justify-center flex-row shadow-md"
          >
            <ChevronRight size={18} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-white font-black text-sm ml-1">Continue to check-in</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
