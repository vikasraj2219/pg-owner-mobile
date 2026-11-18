import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronDown,
  Plus,
  AlertCircle,
  RefreshCw,
  Building,
  Pencil,
  Search,
  X,
  CheckCircle2,
  BedDouble,
} from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useMatrix } from '../../src/hooks/useMatrix';
import { IMatrixBed, IMatrixRoom } from '../../src/types/api';
import { formatINR } from '../../src/utils/currency';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';
import { AddRoomModal } from '../../src/components/AddRoomModal';
import { EditPropertyModal } from '../../src/components/EditPropertyModal';
import { EditRoomModal } from '../../src/components/EditRoomModal';
import { VacantBedSheet } from '../../src/components/VacantBedSheet';
import { OccupiedBedSheet } from '../../src/components/OccupiedBedSheet';
import { MaintenanceBedSheet } from '../../src/components/MaintenanceBedSheet';
import { MatrixEmptyState } from '../../src/components/MatrixEmptyState';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { addBedToRoomApi, deleteBedApi } from '../../src/api/properties';

export default function MatrixScreen() {
  const router = useRouter();
  const {
    properties,
    selectedProperty,
    selectedPropertyId,
    setSelectedPropertyId,
    refetchProperties,
    isLoading: isPropertiesLoading,
  } = useProperties();

  const effectiveMatrixPropertyId =
    selectedPropertyId === 'all' || !selectedPropertyId
      ? properties[0]?._id || null
      : selectedPropertyId;
  const effectiveMatrixProperty =
    selectedPropertyId === 'all' || !selectedPropertyId ? properties[0] || null : selectedProperty;

  const {
    matrixData,
    isLoading: isMatrixLoading,
    isPending: isMatrixPending,
    isFetching: isMatrixFetching,
    isError,
    error,
    isRefetching,
    refetch: refetchMatrix,
    createRoom,
    isCreatingRoom,
    updateBedStatus,
    isUpdatingBedStatus,
  } = useMatrix(effectiveMatrixPropertyId);

  // Automatically refresh bed matrix & properties when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void refetchProperties();
      if (effectiveMatrixPropertyId) {
        void refetchMatrix();
      }
    }, [effectiveMatrixPropertyId, refetchMatrix, refetchProperties]),
  );

  const isDataLoading =
    isPropertiesLoading ||
    (properties.length === 0 && isPropertiesLoading) ||
    (!effectiveMatrixPropertyId && properties.length > 0) ||
    (Boolean(effectiveMatrixPropertyId) &&
      (isMatrixLoading || isMatrixPending || isMatrixFetching) &&
      !matrixData);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [vacantOnly, setVacantOnly] = useState<boolean>(false);

  // Modals state
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isEditPropertyOpen, setIsEditPropertyOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<IMatrixRoom | null>(null);
  const [isAddingBedRoomId, setIsAddingBedRoomId] = useState<string | null>(null);
  const [bedAddedSuccess, setBedAddedSuccess] = useState<{
    bedNumber: string;
    roomNumber: string;
  } | null>(null);
  const [bedToDelete, setBedToDelete] = useState<{ id: string; number: string } | null>(null);
  const [isDeletingBed, setIsDeletingBed] = useState(false);

  // Selected bed sheets state
  const [activeVacantBed, setActiveVacantBed] = useState<{
    bed: IMatrixBed;
    room: IMatrixRoom;
  } | null>(null);
  const [activeOccupiedBed, setActiveOccupiedBed] = useState<{
    bed: IMatrixBed;
    room: IMatrixRoom;
  } | null>(null);
  const [activeMaintenanceBed, setActiveMaintenanceBed] = useState<{
    bed: IMatrixBed;
    room: IMatrixRoom;
  } | null>(null);

  // Determine available floor numbers from matrix data
  const floorsList = useMemo(() => {
    if (!matrixData?.floors || matrixData.floors.length === 0) return [1];
    return matrixData.floors.map(f => f.floorNumber);
  }, [matrixData]);

  // Ensure selectedFloor is valid when floors change
  useEffect(() => {
    if (
      selectedFloor !== 'all' &&
      floorsList.length > 0 &&
      !floorsList.includes(selectedFloor as number)
    ) {
      setSelectedFloor('all');
    }
  }, [floorsList, selectedFloor]);

  const totalRoomsCount = useMemo(() => {
    if (matrixData?.summary?.totalRooms !== undefined && matrixData.summary.totalRooms > 0) {
      return matrixData.summary.totalRooms;
    }
    if (matrixData?.floors) {
      return matrixData.floors.reduce((acc, f) => acc + (f.rooms?.length || 0), 0);
    }
    return 0;
  }, [matrixData]);

  const totalBedsCount = useMemo(() => {
    if (matrixData?.summary?.totalBeds !== undefined && matrixData.summary.totalBeds > 0) {
      return matrixData.summary.totalBeds;
    }
    if (matrixData?.floors) {
      return matrixData.floors.reduce(
        (acc, f) => acc + f.rooms.reduce((rAcc, r) => rAcc + (r.beds?.length || 0), 0),
        0,
      );
    }
    return 0;
  }, [matrixData]);

  const vacantBedsCount = useMemo(() => {
    if (matrixData?.summary?.availableBeds !== undefined) {
      return matrixData.summary.availableBeds;
    }
    if (matrixData?.floors) {
      return matrixData.floors.reduce((acc, f) => {
        return (
          acc +
          f.rooms.reduce((rAcc, r) => {
            return rAcc + r.beds.filter(b => b.status === 'available').length;
          }, 0)
        );
      }, 0);
    }
    return 0;
  }, [matrixData]);

  // Extract all existing room numbers across all floors
  const existingRoomNumbers = useMemo(() => {
    if (!matrixData?.floors) return [];
    return matrixData.floors.flatMap(floor => floor.rooms.map(room => room.roomNumber));
  }, [matrixData]);

  // Filtered floors & rooms based on search query, floor selection, and vacant-only toggle
  const displayFloors = useMemo(() => {
    if (!matrixData?.floors) return [];
    const q = searchQuery.trim().toLowerCase();

    // If searching, search across all floors so the owner immediately finds what they're looking for
    const baseFloors =
      q.length > 0
        ? matrixData.floors
        : selectedFloor === 'all'
          ? matrixData.floors
          : matrixData.floors.filter(f => f.floorNumber === selectedFloor);

    return baseFloors
      .map(floor => {
        const matchingRooms = floor.rooms
          .map(room => {
            let beds = room.beds;
            if (vacantOnly) {
              beds = beds.filter(b => b.status === 'available');
            }
            if (q.length > 0) {
              const roomMatches = room.roomNumber.toLowerCase().includes(q);
              if (!roomMatches) {
                beds = beds.filter(
                  b =>
                    b.bedNumber.toLowerCase().includes(q) ||
                    b.currentTenant?.fullName?.toLowerCase().includes(q) ||
                    b.currentTenant?.phone?.toLowerCase().includes(q),
                );
              }
            }
            return {
              ...room,
              beds,
            };
          })
          .filter(room => room.beds.length > 0);

        return {
          ...floor,
          rooms: matchingRooms,
        };
      })
      .filter(floor => floor.rooms.length > 0);
  }, [matrixData, selectedFloor, vacantOnly, searchQuery]);

  const totalMatchingRoomsCount = useMemo(() => {
    return displayFloors.reduce((acc, f) => acc + f.rooms.length, 0);
  }, [displayFloors]);

  const handleBedPress = (bed: IMatrixBed, room: IMatrixRoom) => {
    if (bed.status === 'available') {
      setActiveVacantBed({ bed, room });
    } else if (bed.status === 'occupied' || bed.status === 'notice_period') {
      setActiveOccupiedBed({ bed, room });
    } else if (bed.status === 'maintenance') {
      setActiveMaintenanceBed({ bed, room });
    }
  };

  const handleMarkMaintenance = async (bedId: string) => {
    try {
      await updateBedStatus({
        bedId,
        payload: {
          status: 'maintenance',
          maintenanceNote: 'Under maintenance',
        },
      });
      setActiveVacantBed(null);
    } catch (_err) {
      Alert.alert('Error', 'Failed to update bed status to maintenance.');
    }
  };

  const handleMarkAvailable = async (bedId: string) => {
    try {
      await updateBedStatus({
        bedId,
        payload: {
          status: 'available',
        },
      });
      setActiveMaintenanceBed(null);
    } catch (_err) {
      Alert.alert('Error', 'Failed to update bed status to available.');
    }
  };

  const handleAddBed = async (roomId: string, roomNumber: string) => {
    if (!effectiveMatrixPropertyId) return;
    setIsAddingBedRoomId(roomId);
    try {
      const newBed = await addBedToRoomApi(effectiveMatrixPropertyId, roomId);
      await Promise.all([refetchMatrix(), refetchProperties()]);
      setBedAddedSuccess({ bedNumber: newBed.bedNumber, roomNumber });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to add bed');
      Alert.alert('Error', msg);
    } finally {
      setIsAddingBedRoomId(null);
    }
  };

  const handleDeleteBed = (bedId: string, bedNumber: string) => {
    setBedToDelete({ id: bedId, number: bedNumber });
  };

  const executeDeleteBed = async () => {
    if (!bedToDelete) return;
    setIsDeletingBed(true);
    try {
      await deleteBedApi(bedToDelete.id);
      setActiveVacantBed(null);
      setActiveMaintenanceBed(null);
      await Promise.all([refetchMatrix(), refetchProperties()]);
      setBedToDelete(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete bed');
      Alert.alert('Cannot Delete', msg);
    } finally {
      setIsDeletingBed(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchProperties(), refetchMatrix()]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
      <StatusBar style="dark" />
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Screen Header with Nilaaya Brand Styling */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: '#FFFDF8',
          borderBottomWidth: 1,
          borderBottomColor: '#E5DDCD',
        }}
      >
        {/* Title & Quick Actions Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#0C192B',
              letterSpacing: -0.5,
            }}
          >
            Bed matrix
          </Text>

          {effectiveMatrixProperty && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsEditPropertyOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#FAF7F2',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pencil size={16} color="#4F5330" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsAddRoomOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#4F5330',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#4F5330',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Subtitle / Property Switcher */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsSwitcherOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
        >
          {searchQuery.trim().length > 0 ? (
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
              {totalMatchingRoomsCount} room{totalMatchingRoomsCount === 1 ? '' : 's'} matching
              &ldquo;
              {searchQuery}&rdquo;
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4F5330' }}>
                {vacantBedsCount} vacant · {effectiveMatrixProperty?.name || 'Select property'}
              </Text>
              <ChevronDown size={14} color="#4F5330" style={{ marginLeft: 3 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Search Bar matching Tenants Screen */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FAF7F2',
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
            placeholder="Search room, bed or tenant..."
            placeholderTextColor="#8E98A0"
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              fontWeight: '500',
              color: '#0C192B',
              paddingVertical: 0,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#657080" />
            </TouchableOpacity>
          )}
        </View>

        {/* Floor Selection & Vacant Filter Chips matching Tenants Screen */}
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
          {/* All Floors Chip */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedFloor('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
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
              All Floors · {totalBedsCount} beds
            </Text>
          </TouchableOpacity>

          {/* Individual Floor Chips */}
          {floorsList.map(floor => {
            const isActive = selectedFloor === floor;
            const floorObj = matrixData?.floors?.find(f => f.floorNumber === floor);
            const bedCount =
              floorObj?.rooms?.reduce((acc, r) => acc + (r.beds?.length || 0), 0) || 0;
            return (
              <TouchableOpacity
                key={floor}
                activeOpacity={0.8}
                onPress={() => setSelectedFloor(floor)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1,
                  marginRight: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
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
                  Floor {floor} · {bedCount} beds
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Vacant Only Filter Chip */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setVacantOnly(prev => !prev)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              borderWidth: 1,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: vacantOnly ? '#19D3E6' : '#FFFDF8',
              borderColor: vacantOnly ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: vacantOnly ? '800' : '600',
                color: vacantOnly ? '#0C192B' : '#657080',
              }}
            >
              Vacant only · {vacantBedsCount}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Status Indicators placed right after filter pills */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            paddingBottom: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#86EFAC',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>Vacant</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: '#FFF1F2',
                borderWidth: 1,
                borderColor: '#FECDD3',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>Occupied</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: '#FEF3C7',
                borderWidth: 1,
                borderColor: '#FDE68A',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>Notice</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: '#FAF7F2',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C192B' }}>Repair</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={['#4F5330']}
            tintColor="#4F5330"
          />
        }
      >
        {/* Loading State */}
        {isDataLoading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}
          >
            <ActivityIndicator size="large" color="#4F5330" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#657080', marginTop: 12 }}>
              Loading bed matrix...
            </Text>
          </View>
        ) : properties.length === 0 ? (
          /* Empty Properties State */
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 64,
              paddingHorizontal: 24,
            }}
          >
            <Building size={48} color="#4F5330" />
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0C192B',
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No properties found
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#657080',
                textAlign: 'center',
                marginBottom: 24,
                maxWidth: 280,
                marginTop: 6,
              }}
            >
              Create your first PG property to start adding rooms and beds.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAddPropertyOpen(true)}
              style={{
                backgroundColor: '#4F5330',
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 }}>
                Add Property
              </Text>
            </TouchableOpacity>
          </View>
        ) : isError && !matrixData ? (
          /* Error State */
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 64,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={32} color="#DC2626" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0C192B',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Unable to load rooms
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#657080',
                textAlign: 'center',
                marginBottom: 24,
                maxWidth: 280,
              }}
            >
              {error instanceof Error
                ? error.message
                : 'Failed to fetch bed matrix data. Please pull down to refresh or tap Retry.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => refetchMatrix()}
              style={{
                backgroundColor: '#4F5330',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : totalRoomsCount === 0 ? (
          /* Empty Matrix State */
          <MatrixEmptyState onAddRoom={() => setIsAddRoomOpen(true)} />
        ) : displayFloors.length === 0 ? (
          /* No Matching Rooms or Beds Filter Result */
          <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{ fontSize: 15, fontWeight: '700', color: '#0C192B', textAlign: 'center' }}
            >
              No rooms or beds found
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#657080',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {searchQuery.trim().length > 0
                ? `No results matching "${searchQuery}"`
                : vacantOnly
                  ? 'No vacant beds on this floor'
                  : 'No rooms found on this floor'}
            </Text>
          </View>
        ) : (
          <>
            {/* Room Cards grouped by Floor */}
            {displayFloors.map(floor => (
              <View key={`floor-${floor.floorNumber}`} style={{ marginBottom: 12 }}>
                {/* Floor Section Header when multiple floors are shown or searching */}
                {(selectedFloor === 'all' || searchQuery.trim().length > 0) &&
                  displayFloors.length > 1 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 10,
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: '#4F5330',
                          marginRight: 8,
                        }}
                      />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}>
                        Floor {floor.floorNumber}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#657080',
                          marginLeft: 6,
                        }}
                      >
                        ({floor.rooms.length} {floor.rooms.length === 1 ? 'room' : 'rooms'})
                      </Text>
                    </View>
                  )}

                {floor.rooms.map(room => (
                  <View
                    key={room._id}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 14,
                    }}
                  >
                    {/* Room Header with Edit & Quick Add Bed */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: '800',
                            color: '#0C192B',
                            marginRight: 8,
                          }}
                        >
                          Room {room.roomNumber}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setRoomToEdit(room)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: '#FAF7F2',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pencil size={13} color="#4F5330" />
                        </TouchableOpacity>
                      </View>

                      {/* Room Tags */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        {(room.tags || [])
                          .filter(
                            tag =>
                              !['single', 'double', 'triple'].includes(tag.toLowerCase()) &&
                              !tag.toLowerCase().includes('sharing'),
                          )
                          .map(tag => {
                            const displayTag =
                              tag.toLowerCase() === 'attached washroom' ? 'Washroom' : tag;
                            return (
                              <View
                                key={tag}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: '#E5DDCD',
                                  backgroundColor: '#FAF7F2',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: '#657080',
                                  }}
                                >
                                  {displayTag}
                                </Text>
                              </View>
                            );
                          })}
                      </View>
                    </View>

                    {/* Bed Chips Row / Grid */}
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      {room.beds.map(bed => {
                        // 1. Available / Vacant Bed
                        if (bed.status === 'available') {
                          return (
                            <TouchableOpacity
                              key={bed._id}
                              activeOpacity={0.8}
                              onPress={() => handleBedPress(bed, room)}
                              style={{
                                flex: 1,
                                minWidth: 95,
                                minHeight: 88,
                                backgroundColor: '#F0FDF4',
                                borderWidth: 1,
                                borderColor: '#86EFAC',
                                borderRadius: 14,
                                padding: 12,
                                justifyContent: 'space-between',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
                                {bed.bedNumber}
                              </Text>
                              <View>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                                  Vacant
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: '#15803D',
                                    marginTop: 2,
                                  }}
                                >
                                  {formatINR(bed.baseRentPaise || room.baseRentPaisePerBed)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        }

                        // 2. Occupied Bed
                        if (bed.status === 'occupied') {
                          const tenantName = bed.currentTenant?.fullName || 'Tenant';
                          const firstName = tenantName.split(' ')[0];
                          const initials = tenantName
                            .split(' ')
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();
                          const isDue =
                            bed.currentTenant?.paymentStatus === 'DUE' ||
                            (bed.currentTenant?.rentDuePaise && bed.currentTenant.rentDuePaise > 0);

                          return (
                            <TouchableOpacity
                              key={bed._id}
                              activeOpacity={0.8}
                              onPress={() => handleBedPress(bed, room)}
                              style={{
                                flex: 1,
                                minWidth: 95,
                                minHeight: 88,
                                backgroundColor: '#FFF1F2',
                                borderWidth: 1,
                                borderColor: '#FECDD3',
                                borderRadius: 14,
                                padding: 12,
                                justifyContent: 'space-between',
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>
                                  {bed.bedNumber}
                                </Text>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: '#FFE4E6',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 10, fontWeight: '800', color: '#BE123C' }}
                                  >
                                    {initials}
                                  </Text>
                                </View>
                              </View>
                              <View>
                                <Text
                                  numberOfLines={1}
                                  style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}
                                >
                                  {firstName}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: 2,
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}
                                  >
                                    {formatINR(
                                      bed.currentTenant?.monthlyRentPaise ||
                                        bed.baseRentPaise ||
                                        room.baseRentPaisePerBed,
                                    )}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '800',
                                      color: isDue ? '#E11D48' : '#15803D',
                                    }}
                                  >
                                    {isDue ? 'DUE' : 'PAID'}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        }

                        // 3. Notice Period Bed
                        if (bed.status === 'notice_period') {
                          const tenantName = bed.currentTenant?.fullName || 'Tenant';
                          const firstName = tenantName.split(' ')[0];
                          const initials = tenantName
                            .split(' ')
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                          const daysLeft = bed.noticeEndDate
                            ? Math.max(
                                0,
                                Math.ceil(
                                  (new Date(bed.noticeEndDate).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24),
                                ),
                              )
                            : null;
                          const noticeText =
                            daysLeft !== null
                              ? daysLeft === 0
                                ? 'Ends today'
                                : `${daysLeft}d left`
                              : 'Notice';

                          return (
                            <TouchableOpacity
                              key={bed._id}
                              activeOpacity={0.8}
                              onPress={() => handleBedPress(bed, room)}
                              style={{
                                flex: 1,
                                minWidth: 95,
                                minHeight: 88,
                                backgroundColor: '#FEF3C7',
                                borderWidth: 1,
                                borderColor: '#FDE68A',
                                borderRadius: 14,
                                padding: 12,
                                justifyContent: 'space-between',
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>
                                  {bed.bedNumber}
                                </Text>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: '#FDE68A',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}
                                  >
                                    {initials}
                                  </Text>
                                </View>
                              </View>
                              <View>
                                <Text
                                  numberOfLines={1}
                                  style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}
                                >
                                  {firstName}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: 2,
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}
                                  >
                                    {formatINR(
                                      bed.currentTenant?.monthlyRentPaise ||
                                        bed.baseRentPaise ||
                                        room.baseRentPaisePerBed,
                                    )}
                                  </Text>
                                  <Text
                                    style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}
                                  >
                                    {noticeText}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        }

                        // 4. Maintenance Bed
                        return (
                          <TouchableOpacity
                            key={bed._id}
                            activeOpacity={0.8}
                            onPress={() => handleBedPress(bed, room)}
                            style={{
                              flex: 1,
                              minWidth: 95,
                              minHeight: 88,
                              backgroundColor: '#FAF7F2',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              borderRadius: 14,
                              padding: 12,
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#657080' }}>
                              {bed.bedNumber}
                            </Text>
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B' }}>
                                Maintenance
                              </Text>
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: '#657080',
                                  marginTop: 2,
                                }}
                              >
                                {bed.maintenanceNote || 'Repair'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Quick + Bed Dashed Chip */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={isAddingBedRoomId === room._id}
                        onPress={() => handleAddBed(room._id, room.roomNumber)}
                        style={{
                          minWidth: 80,
                          minHeight: 88,
                          backgroundColor: '#FAF7F2',
                          borderWidth: 1,
                          borderStyle: 'dashed',
                          borderColor: '#CBD5E1',
                          borderRadius: 14,
                          padding: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isAddingBedRoomId === room._id ? (
                          <ActivityIndicator size="small" color="#4F5330" />
                        ) : (
                          <>
                            <Plus size={18} color="#4F5330" strokeWidth={2.5} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: '#4F5330',
                                marginTop: 4,
                              }}
                            >
                              + Bed
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Property Switcher Modal */}
      <PropertySwitcherModal
        visible={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => setSelectedPropertyId(id)}
        onOpenAddProperty={() => setIsAddPropertyOpen(true)}
        onEditProperty={() => setIsEditPropertyOpen(true)}
      />

      {/* Add Property Modal */}
      <AddPropertyModal
        visible={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={id => {
          setSelectedPropertyId(id);
          setIsAddRoomOpen(true);
        }}
      />

      {/* Add Room Modal */}
      <AddRoomModal
        visible={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        property={effectiveMatrixProperty}
        existingRooms={existingRoomNumbers}
        existingFloors={floorsList}
        defaultFloor={typeof selectedFloor === 'number' ? selectedFloor : floorsList[0] || 1}
        onSubmit={payload => createRoom(payload)}
        isSubmitting={isCreatingRoom}
      />

      {/* Vacant Bed Bottom Sheet */}
      <VacantBedSheet
        visible={!!activeVacantBed}
        onClose={() => setActiveVacantBed(null)}
        bed={activeVacantBed?.bed || null}
        room={activeVacantBed?.room || null}
        onCheckIn={bedId => {
          const bedNumber = activeVacantBed?.bed.bedNumber || '';
          const baseRentPaise = String(
            activeVacantBed?.bed.baseRentPaise ||
              activeVacantBed?.room.baseRentPaisePerBed ||
              850000,
          );
          const propertyId = effectiveMatrixPropertyId || '';
          const roomNumber = activeVacantBed?.room.roomNumber || '';
          const floorNumber = String(
            activeVacantBed?.room.floorNumber ||
              (typeof selectedFloor === 'number' ? selectedFloor : 1),
          );
          const sharingType = String(activeVacantBed?.room.sharingType || 2);
          router.push({
            pathname: '/checkin/[bedId]',
            params: {
              bedId,
              bedNumber,
              baseRentPaise,
              propertyId,
              roomNumber,
              floorNumber,
              sharingType,
            },
          });
        }}
        onMarkMaintenance={handleMarkMaintenance}
        onDeleteBed={handleDeleteBed}
        isLoading={isUpdatingBedStatus}
      />

      {/* Occupied Bed Bottom Sheet */}
      <OccupiedBedSheet
        visible={!!activeOccupiedBed}
        onClose={() => setActiveOccupiedBed(null)}
        bed={activeOccupiedBed?.bed || null}
        room={activeOccupiedBed?.room || null}
        upiVpa={effectiveMatrixProperty?.upiVpa}
        onViewProfile={tenantId => {
          setActiveOccupiedBed(null);
          router.push(`/tenant/${tenantId}` as any);
        }}
        onCheckout={tenantId => {
          setActiveOccupiedBed(null);
          router.push(`/checkout/${tenantId}`);
        }}
      />

      {/* Maintenance Bed Bottom Sheet */}
      <MaintenanceBedSheet
        visible={!!activeMaintenanceBed}
        onClose={() => setActiveMaintenanceBed(null)}
        bed={activeMaintenanceBed?.bed || null}
        room={activeMaintenanceBed?.room || null}
        onMarkAvailable={handleMarkAvailable}
        onDeleteBed={handleDeleteBed}
        isLoading={isUpdatingBedStatus}
      />

      {/* Edit Property Modal */}
      <EditPropertyModal
        visible={isEditPropertyOpen}
        property={effectiveMatrixProperty}
        onClose={() => setIsEditPropertyOpen(false)}
        onSuccess={() => {
          refetchProperties();
          refetchMatrix();
        }}
      />

      {/* Edit Room Modal */}
      <EditRoomModal
        visible={!!roomToEdit}
        propertyId={effectiveMatrixPropertyId || ''}
        property={effectiveMatrixProperty}
        existingFloors={floorsList}
        existingRooms={existingRoomNumbers}
        room={roomToEdit}
        onClose={() => setRoomToEdit(null)}
        onSuccess={() => {
          refetchMatrix();
          refetchProperties();
        }}
      />

      {/* Modern In-App Success Modal for Bed Addition */}
      <Modal
        visible={!!bedAddedSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setBedAddedSuccess(null)}
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
                  backgroundColor: '#E6F7F2',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={26} color="#059669" strokeWidth={2.4} />
              </View>

              <TouchableOpacity
                onPress={() => setBedAddedSuccess(null)}
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
              Bed Added Successfully!
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
              Bed{' '}
              <Text style={{ fontWeight: '800', color: '#0C192B' }}>
                {bedAddedSuccess?.bedNumber}
              </Text>{' '}
              has been added to{' '}
              <Text style={{ fontWeight: '800', color: '#0C192B' }}>
                Room {bedAddedSuccess?.roomNumber}
              </Text>{' '}
              and is now available for tenant check-in.
            </Text>

            {/* Bed Status Card */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                borderRadius: 14,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <BedDouble size={16} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                  Bed {bedAddedSuccess?.bedNumber} • Vacant
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#15803D', marginTop: 1 }}>
                  Ready to assign to a tenant
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setBedAddedSuccess(null)}
              style={{
                backgroundColor: '#4F5330',
                height: 48,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bed Deletion Confirmation Dialog */}
      <ConfirmDeleteModal
        visible={!!bedToDelete}
        onClose={() => setBedToDelete(null)}
        onConfirm={executeDeleteBed}
        title={`Delete Bed ${bedToDelete?.number}?`}
        message="Are you sure you want to delete this vacant bed? This action cannot be undone."
        confirmLabel="Delete Bed"
        isLoading={isDeletingBed}
      />
    </SafeAreaView>
  );
}
