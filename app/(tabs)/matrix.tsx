import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type BedStatus = 'vacant' | 'occupied' | 'notice' | 'maintenance';

interface BedItem {
  id: string;
  roomNumber: string;
  status: BedStatus;
  tenantName?: string;
  paymentStatus?: 'PAID' | 'DUE';
  rent?: string;
  noticeInfo?: string;
  maintenanceNote?: string;
}

interface RoomGroup {
  roomNumber: string;
  floor: number;
  tags: string[];
  beds: BedItem[];
}

export default function MatrixScreen() {
  const router = useRouter();
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [vacantOnly, setVacantOnly] = useState<boolean>(false);

  const roomsData: RoomGroup[] = [
    {
      roomNumber: '101',
      floor: 1,
      tags: ['AC', 'Washroom'],
      beds: [
        {
          id: '101-A',
          roomNumber: '101',
          status: 'occupied',
          tenantName: 'Rahul Verma',
          paymentStatus: 'PAID',
        },
        {
          id: '101-B',
          roomNumber: '101',
          status: 'occupied',
          tenantName: 'Suresh Kumar',
          paymentStatus: 'DUE',
        },
        {
          id: '101-C',
          roomNumber: '101',
          status: 'vacant',
          rent: '₹7,500',
        },
      ],
    },
    {
      roomNumber: '102',
      floor: 1,
      tags: ['Washroom'],
      beds: [
        {
          id: '102-A',
          roomNumber: '102',
          status: 'vacant',
          rent: '₹9,000',
        },
        {
          id: '102-B',
          roomNumber: '102',
          status: 'notice',
          tenantName: 'Anil Reddy',
          noticeInfo: 'Notice · 3 days',
        },
      ],
    },
    {
      roomNumber: '103',
      floor: 1,
      tags: ['AC', 'Single'],
      beds: [
        {
          id: '103-A',
          roomNumber: '103',
          status: 'maintenance',
          maintenanceNote: 'Repair',
        },
      ],
    },
    {
      roomNumber: '201',
      floor: 2,
      tags: ['AC', 'Triple sharing'],
      beds: [
        {
          id: '201-A',
          roomNumber: '201',
          status: 'vacant',
          rent: '₹8,500',
        },
        {
          id: '201-B',
          roomNumber: '201',
          status: 'occupied',
          tenantName: 'Karthik Rao',
          paymentStatus: 'PAID',
        },
        {
          id: '201-C',
          roomNumber: '201',
          status: 'occupied',
          tenantName: 'Deepak S',
          paymentStatus: 'PAID',
        },
      ],
    },
    {
      roomNumber: '301',
      floor: 3,
      tags: ['AC', 'Washroom'],
      beds: [
        {
          id: '301-A',
          roomNumber: '301',
          status: 'vacant',
          rent: '₹8,000',
        },
        {
          id: '301-B',
          roomNumber: '301',
          status: 'occupied',
          tenantName: 'Vikas Roy',
          paymentStatus: 'DUE',
        },
      ],
    },
  ];

  // Filtering
  const filteredRooms = roomsData
    .filter(room => room.floor === selectedFloor)
    .map(room => {
      if (vacantOnly) {
        return {
          ...room,
          beds: room.beds.filter(b => b.status === 'vacant'),
        };
      }
      return room;
    })
    .filter(room => room.beds.length > 0);

  const handleBedPress = (bed: BedItem) => {
    if (bed.status === 'vacant') {
      router.push(`/checkin/${bed.id}`);
    } else if (bed.status === 'occupied') {
      Alert.alert(
        `Bed ${bed.id} · ${bed.tenantName}`,
        `Payment status: ${bed.paymentStatus}\nWhat would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View in Dues',
            onPress: () => router.push('/(tabs)/dues'),
          },
          {
            text: 'Checkout Tenant',
            onPress: () => router.push(`/checkout/${bed.id}`),
          },
        ],
      );
    } else if (bed.status === 'notice') {
      Alert.alert(
        `Bed ${bed.id} · ${bed.tenantName}`,
        `${bed.noticeInfo}\nTenant is vacating soon.`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Initiate Checkout Settlement',
            onPress: () => router.push(`/checkout/${bed.id}`),
          },
        ],
      );
    } else {
      Alert.alert('Bed under maintenance', 'Currently scheduled for plumbing/electrical repair.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title & Subtitle */}
        <View className="mb-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">Bed matrix</Text>
          <Text className="text-sm font-medium text-slate-600 mt-1">
            Sri Sai Boys PG · 6 beds vacant
          </Text>
        </View>

        {/* Filter Pills Row */}
        <View className="flex-row items-center gap-2 mb-5 flex-wrap">
          {[1, 2, 3].map(floor => {
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
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>
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
            <Text className={`text-sm font-bold ${vacantOnly ? 'text-white' : 'text-slate-800'}`}>
              Vacant only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Room Cards List */}
        {filteredRooms.map(room => (
          <View
            key={room.roomNumber}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs"
          >
            {/* Room Header */}
            <View className="flex-row items-center justify-between mb-3.5">
              <Text className="text-lg font-extrabold text-slate-900">Room {room.roomNumber}</Text>
              <View className="flex-row items-center gap-1.5">
                {room.tags.map(tag => (
                  <View
                    key={tag}
                    className="px-2 py-0.5 rounded-md border border-slate-200 bg-white"
                  >
                    <Text className="text-xs font-semibold text-slate-600">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bed Chips Row / Grid */}
            <View className="flex-row gap-2.5 flex-wrap">
              {room.beds.map(bed => {
                if (bed.status === 'vacant') {
                  return (
                    <TouchableOpacity
                      key={bed.id}
                      activeOpacity={0.8}
                      onPress={() => handleBedPress(bed)}
                      className="flex-1 min-w-[95px] bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-3 justify-between"
                      style={{ minHeight: 88 }}
                    >
                      <Text className="text-xs font-semibold text-[#0A6C50]">{bed.id}</Text>
                      <View>
                        <Text className="text-sm font-bold text-slate-900">Vacant</Text>
                        <Text className="text-xs font-bold text-[#0A6C50] mt-0.5">{bed.rent}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                if (bed.status === 'occupied') {
                  return (
                    <TouchableOpacity
                      key={bed.id}
                      activeOpacity={0.8}
                      onPress={() => handleBedPress(bed)}
                      className="flex-1 min-w-[95px] bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 justify-between"
                      style={{ minHeight: 88 }}
                    >
                      <Text className="text-xs font-semibold text-rose-500">{bed.id}</Text>
                      <View>
                        <Text
                          className="text-sm font-bold text-slate-900 truncate"
                          numberOfLines={1}
                        >
                          {bed.tenantName}
                        </Text>
                        <Text className="text-xs font-bold text-rose-600 mt-0.5">
                          {bed.paymentStatus}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                if (bed.status === 'notice') {
                  return (
                    <TouchableOpacity
                      key={bed.id}
                      activeOpacity={0.8}
                      onPress={() => handleBedPress(bed)}
                      className="flex-1 min-w-[95px] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 justify-between"
                      style={{ minHeight: 88 }}
                    >
                      <Text className="text-xs font-semibold text-amber-700">{bed.id}</Text>
                      <View>
                        <Text
                          className="text-sm font-bold text-slate-900 truncate"
                          numberOfLines={1}
                        >
                          {bed.tenantName}
                        </Text>
                        <Text className="text-xs font-bold text-amber-700 mt-0.5">
                          {bed.noticeInfo}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                // Maintenance
                return (
                  <TouchableOpacity
                    key={bed.id}
                    activeOpacity={0.8}
                    onPress={() => handleBedPress(bed)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 justify-between"
                    style={{ minHeight: 88 }}
                  >
                    <Text className="text-xs font-semibold text-slate-500">{bed.id}</Text>
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
        ))}

        {/* Bottom Status Legend */}
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
      </ScrollView>
    </SafeAreaView>
  );
}
