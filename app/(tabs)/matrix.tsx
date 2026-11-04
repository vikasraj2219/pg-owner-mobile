import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronDown, Plus, AlertCircle, RefreshCw, Building } from 'lucide-react-native';
import { useProperties } from '../../src/context/PropertyContext';
import { useMatrix } from '../../src/hooks/useMatrix';
import { IMatrixBed, IMatrixRoom } from '../../src/types/api';
import { formatINR } from '../../src/utils/currency';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';
import { AddRoomModal } from '../../src/components/AddRoomModal';
import { VacantBedSheet } from '../../src/components/VacantBedSheet';
import { OccupiedBedSheet } from '../../src/components/OccupiedBedSheet';
import { MaintenanceBedSheet } from '../../src/components/MaintenanceBedSheet';
import { MatrixEmptyState } from '../../src/components/MatrixEmptyState';

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
  } = useMatrix(selectedPropertyId);

  // Automatically refresh bed matrix when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedPropertyId) {
        void refetchMatrix();
      }
    }, [selectedPropertyId, refetchMatrix]),
  );

  const isDataLoading =
    isPropertiesLoading ||
    (!selectedPropertyId && properties.length > 0) ||
    (Boolean(selectedPropertyId) &&
      (isMatrixLoading || isMatrixPending || isMatrixFetching) &&
      !matrixData);

  // Filters state
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [vacantOnly, setVacantOnly] = useState<boolean>(false);

  // Modals state
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);

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
    if (floorsList.length > 0 && !floorsList.includes(selectedFloor)) {
      setSelectedFloor(floorsList[0]);
    }
  }, [floorsList, selectedFloor]);

  // Filtered rooms for the selected floor
  const currentFloorRooms = useMemo(() => {
    if (!matrixData?.floors) return [];
    const floorObj = matrixData.floors.find(f => f.floorNumber === selectedFloor);
    if (!floorObj) return [];

    return floorObj.rooms
      .map(room => {
        if (vacantOnly) {
          return {
            ...room,
            beds: room.beds.filter(b => b.status === 'available'),
          };
        }
        return room;
      })
      .filter(room => room.beds.length > 0);
  }, [matrixData, selectedFloor, vacantOnly]);

  const totalRoomsCount = useMemo(() => {
    if (matrixData?.summary?.totalRooms !== undefined && matrixData.summary.totalRooms > 0) {
      return matrixData.summary.totalRooms;
    }
    if (matrixData?.floors) {
      return matrixData.floors.reduce((acc, f) => acc + (f.rooms?.length || 0), 0);
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

  const handleRefresh = async () => {
    await Promise.all([refetchProperties(), refetchMatrix()]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      {/* Offline Banner matching Page 50 */}
      <OfflineBanner />

      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={['#0A6C50']}
            tintColor="#0A6C50"
          />
        }
      >
        {/* Screen Title & Property Switcher Pill Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-3">
            <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Bed matrix
            </Text>

            {/* Clickable Property Selector Pill matching Page 2 */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSwitcherOpen(true)}
              className="flex-row items-center bg-[#E8F5EE] border border-[#A7F3D0] rounded-full px-3.5 py-1.5 mt-2 self-start"
            >
              <Text className="text-xs font-bold text-[#0A6C50]">
                {vacantBedsCount} beds vacant · {selectedProperty?.name || 'Select property'}
              </Text>
              <ChevronDown size={14} color="#0A6C50" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Quick Add Room Button */}
          {selectedProperty && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAddRoomOpen(true)}
              className="w-10 h-10 rounded-full bg-[#0A6C50] items-center justify-center shadow-sm mt-1"
            >
              <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State */}
        {isDataLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-sm font-semibold text-slate-500 mt-3">Loading bed matrix...</Text>
          </View>
        ) : properties.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16 px-6">
            <Building size={48} color="#0A6C50" />
            <Text className="text-xl font-bold text-slate-900 mt-4 text-center">
              No properties found
            </Text>
            <Text className="text-sm font-medium text-slate-500 text-center mb-6 max-w-[280px]">
              Create your first PG property to start adding rooms and beds.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAddPropertyOpen(true)}
              className="bg-[#0A6C50] px-6 py-3.5 rounded-xl flex-row items-center shadow-sm"
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-sm font-bold text-white ml-2">Add Property</Text>
            </TouchableOpacity>
          </View>
        ) : isError && !matrixData ? (
          <View className="flex-1 justify-center items-center py-16 px-6">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
              <AlertCircle size={32} color="#DC2626" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
              Unable to load rooms
            </Text>
            <Text className="text-sm font-medium text-slate-500 text-center mb-6 max-w-[280px]">
              {error instanceof Error
                ? error.message
                : 'Failed to fetch bed matrix data. Please pull down to refresh or tap Retry.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => refetchMatrix()}
              className="bg-[#0A6C50] px-6 py-3 rounded-xl flex-row items-center"
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white ml-2">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : totalRoomsCount === 0 ? (
          /* Empty State matching Page 49 */
          <MatrixEmptyState onAddRoom={() => setIsAddRoomOpen(true)} />
        ) : (
          <>
            {/* Filter Pills Row matching Page 2 */}
            <View className="flex-row items-center gap-2 mb-5 flex-wrap">
              {floorsList.map(floor => {
                const isActive = selectedFloor === floor;
                return (
                  <TouchableOpacity
                    key={floor}
                    activeOpacity={0.8}
                    onPress={() => setSelectedFloor(floor)}
                    className={`px-5 py-2.5 rounded-full ${
                      isActive ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}
                    >
                      Floor {floor}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setVacantOnly(!vacantOnly)}
                className={`px-5 py-2.5 rounded-full ml-auto ${
                  vacantOnly ? 'bg-[#0A6C50]' : 'bg-white border border-slate-200'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${vacantOnly ? 'text-white' : 'text-slate-800'}`}
                >
                  Vacant only
                </Text>
              </TouchableOpacity>
            </View>

            {/* Room Cards List */}
            {currentFloorRooms.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Text className="text-sm font-semibold text-slate-400">
                  {vacantOnly ? 'No vacant beds on this floor' : 'No rooms found on this floor'}
                </Text>
              </View>
            ) : (
              currentFloorRooms.map(room => (
                <View
                  key={room._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs"
                >
                  {/* Room Header */}
                  <View className="flex-row items-center justify-between mb-3.5">
                    <Text className="text-lg font-extrabold text-slate-900">
                      Room {room.roomNumber}
                    </Text>
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      {(room.tags || []).map(tag => (
                        <View
                          key={tag}
                          className="px-2 py-0.5 rounded-md border border-slate-200 bg-white"
                        >
                          <Text className="text-xs font-semibold text-slate-600">{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Bed Chips Row / Grid matching Page 2 */}
                  <View className="flex-row gap-2.5 flex-wrap">
                    {room.beds.map(bed => {
                      // 1. Available / Vacant Bed (🟢)
                      if (bed.status === 'available') {
                        return (
                          <TouchableOpacity
                            key={bed._id}
                            activeOpacity={0.8}
                            onPress={() => handleBedPress(bed, room)}
                            className="flex-1 min-w-[95px] bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-3 justify-between"
                            style={{ minHeight: 88 }}
                          >
                            <Text className="text-xs font-semibold text-[#0A6C50]">
                              {bed.bedNumber}
                            </Text>
                            <View>
                              <Text className="text-sm font-bold text-slate-900">Vacant</Text>
                              <Text className="text-xs font-bold text-[#0A6C50] mt-0.5">
                                {formatINR(bed.baseRentPaise || room.baseRentPaisePerBed)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }

                      // 2. Occupied Bed (🔴)
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
                            className="flex-1 min-w-[95px] bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 justify-between"
                            style={{ minHeight: 88 }}
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="text-xs font-semibold text-rose-500">
                                {bed.bedNumber}
                              </Text>
                              <View className="w-5 h-5 rounded-full bg-rose-100 items-center justify-center">
                                <Text className="text-[10px] font-extrabold text-rose-700">
                                  {initials}
                                </Text>
                              </View>
                            </View>
                            <View>
                              <Text
                                className="text-sm font-bold text-slate-900 truncate"
                                numberOfLines={1}
                              >
                                {firstName}
                              </Text>
                              <Text
                                className={`text-xs font-bold mt-0.5 ${
                                  isDue ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {isDue ? 'DUE' : 'PAID'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }

                      // 3. Notice Period Bed (🟡)
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
                              ? 'Notice · Ends today'
                              : `Notice · ${daysLeft}d left`
                            : 'Notice Period';

                        return (
                          <TouchableOpacity
                            key={bed._id}
                            activeOpacity={0.8}
                            onPress={() => handleBedPress(bed, room)}
                            className="flex-1 min-w-[95px] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 justify-between"
                            style={{ minHeight: 88 }}
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="text-xs font-semibold text-amber-700">
                                {bed.bedNumber}
                              </Text>
                              <View className="w-5 h-5 rounded-full bg-amber-100 items-center justify-center">
                                <Text className="text-[10px] font-extrabold text-amber-800">
                                  {initials}
                                </Text>
                              </View>
                            </View>
                            <View>
                              <Text
                                className="text-sm font-bold text-slate-900 truncate"
                                numberOfLines={1}
                              >
                                {firstName}
                              </Text>
                              <Text className="text-[11px] font-bold text-amber-700 mt-0.5">
                                {noticeText}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }

                      // 4. Maintenance Bed (⚪)
                      return (
                        <TouchableOpacity
                          key={bed._id}
                          activeOpacity={0.8}
                          onPress={() => handleBedPress(bed, room)}
                          className="flex-1 min-w-[95px] bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 justify-between"
                          style={{ minHeight: 88 }}
                        >
                          <Text className="text-xs font-semibold text-slate-500">
                            {bed.bedNumber}
                          </Text>
                          <View>
                            <Text className="text-sm font-bold text-slate-900">Maintenance</Text>
                            <Text className="text-xs font-bold text-slate-500 mt-0.5">
                              {bed.maintenanceNote || 'Repair'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}

            {/* Bottom Status Legend matching Page 2 */}
            <View className="flex-row items-center justify-around py-4 mt-2">
              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-sm bg-[#F0FDF4] border border-[#86EFAC] mr-1.5" />
                <Text className="text-xs font-semibold text-slate-700">Vacant</Text>
              </View>

              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-sm bg-[#FFF1F2] border border-[#FECDD3] mr-1.5" />
                <Text className="text-xs font-semibold text-slate-700">Occupied</Text>
              </View>

              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-sm bg-[#FFFBEB] border border-[#FDE68A] mr-1.5" />
                <Text className="text-xs font-semibold text-slate-700">Notice</Text>
              </View>

              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-sm bg-[#F8FAFC] border border-[#CBD5E1] mr-1.5" />
                <Text className="text-xs font-semibold text-slate-700">Maintenance</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Property Switcher Modal matching Page 12 */}
      <PropertySwitcherModal
        visible={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => setSelectedPropertyId(id)}
        onOpenAddProperty={() => setIsAddPropertyOpen(true)}
      />

      {/* Add Property Modal matching Page 38 */}
      <AddPropertyModal
        visible={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={id => {
          setSelectedPropertyId(id);
          setIsAddRoomOpen(true);
        }}
      />

      {/* Add Room Modal matching Page 39 */}
      <AddRoomModal
        visible={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        property={selectedProperty}
        existingRooms={existingRoomNumbers}
        defaultFloor={selectedFloor}
        onSubmit={payload => createRoom(payload)}
        isSubmitting={isCreatingRoom}
      />

      {/* Vacant Bed Bottom Sheet matching Page 13 */}
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
          const propertyId = selectedPropertyId || '';
          const roomNumber = activeVacantBed?.room.roomNumber || '';
          const floorNumber = String(activeVacantBed?.room.floorNumber || selectedFloor || 1);
          router.push({
            pathname: '/checkin/[bedId]',
            params: {
              bedId,
              bedNumber,
              baseRentPaise,
              propertyId,
              roomNumber,
              floorNumber,
            },
          });
        }}
        onMarkMaintenance={handleMarkMaintenance}
        isLoading={isUpdatingBedStatus}
      />

      {/* Occupied Bed Bottom Sheet matching Page 14 */}
      <OccupiedBedSheet
        visible={!!activeOccupiedBed}
        onClose={() => setActiveOccupiedBed(null)}
        bed={activeOccupiedBed?.bed || null}
        room={activeOccupiedBed?.room || null}
        upiVpa={selectedProperty?.upiVpa}
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
        isLoading={isUpdatingBedStatus}
      />
    </SafeAreaView>
  );
}
