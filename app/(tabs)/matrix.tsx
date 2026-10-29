import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatINR } from '../../src/utils/currency';

type MockBed =
  | { bedNumber: string; status: 'available'; rentPaise?: number }
  | { bedNumber: string; status: 'occupied'; tenantName: string; paymentStatus: 'PAID' | 'DUE' }
  | { bedNumber: string; status: 'notice_period'; tenantName: string; daysLeft: number }
  | { bedNumber: string; status: 'maintenance' };

interface MockRoom {
  roomNumber: string;
  floor: number;
  sharing: string;
  baseRentPaise: number;
  beds: MockBed[];
}

export default function MatrixScreen() {
  const router = useRouter();
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [vacantOnly, setVacantOnly] = useState(false);

  // Wireframe rooms mock data
  const rooms: MockRoom[] = [
    {
      roomNumber: '101',
      floor: 1,
      sharing: '2-Sharing',
      baseRentPaise: 850000,
      beds: [
        { bedNumber: '101-A', status: 'available', rentPaise: 850000 },
        {
          bedNumber: '101-B',
          status: 'occupied',
          tenantName: 'Rahul Verma',
          paymentStatus: 'PAID',
        },
      ],
    },
    {
      roomNumber: '102',
      floor: 1,
      sharing: '3-Sharing',
      baseRentPaise: 700000,
      beds: [
        { bedNumber: '102-A', status: 'occupied', tenantName: 'Amit Shah', paymentStatus: 'DUE' },
        { bedNumber: '102-B', status: 'notice_period', tenantName: 'Vikram Singh', daysLeft: 6 },
        { bedNumber: '102-C', status: 'maintenance' },
      ],
    },
    {
      roomNumber: '201',
      floor: 2,
      sharing: '2-Sharing',
      baseRentPaise: 900000,
      beds: [
        { bedNumber: '201-A', status: 'available', rentPaise: 900000 },
        { bedNumber: '201-B', status: 'available', rentPaise: 900000 },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Floor Filter Pills */}
      <View className="flex-row items-center gap-2 mb-4">
        <TouchableOpacity
          className={`px-3 py-1.5 rounded-full ${selectedFloor === null ? 'bg-primary-600' : 'bg-white border border-slate-200'}`}
          onPress={() => setSelectedFloor(null)}
        >
          <Text
            className={`text-xs font-semibold ${selectedFloor === null ? 'text-white' : 'text-slate-700'}`}
          >
            All Floors
          </Text>
        </TouchableOpacity>

        {[1, 2].map(floor => (
          <TouchableOpacity
            key={floor}
            className={`px-3 py-1.5 rounded-full ${selectedFloor === floor ? 'bg-primary-600' : 'bg-white border border-slate-200'}`}
            onPress={() => setSelectedFloor(floor)}
          >
            <Text
              className={`text-xs font-semibold ${selectedFloor === floor ? 'text-white' : 'text-slate-700'}`}
            >
              Floor {floor}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          className={`ml-auto px-3 py-1.5 rounded-full ${vacantOnly ? 'bg-emerald-600' : 'bg-white border border-slate-200'}`}
          onPress={() => setVacantOnly(!vacantOnly)}
        >
          <Text className={`text-xs font-semibold ${vacantOnly ? 'text-white' : 'text-slate-700'}`}>
            🟢 Vacant Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Room & Bed Cards Grid */}
      {rooms.map(room => (
        <View
          key={room.roomNumber}
          className="bg-white rounded-xl p-4 mb-4 border border-slate-200 shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-lg font-bold text-slate-900">Room {room.roomNumber}</Text>
              <Text className="text-xs text-slate-500">{room.sharing}</Text>
            </View>
            <Text className="text-xs font-medium text-slate-600">
              {formatINR(room.baseRentPaise)}/mo
            </Text>
          </View>

          {/* Bed Chips */}
          <View className="flex-row flex-wrap gap-2">
            {room.beds.map(bed => {
              if (bed.status === 'available') {
                return (
                  <TouchableOpacity
                    key={bed.bedNumber}
                    className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 flex-1 min-w-[120px]"
                    onPress={() => router.push(`/checkin/${bed.bedNumber}`)}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-emerald-800">{bed.bedNumber}</Text>
                      <Text className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                        VACANT
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-emerald-700 mt-1">
                      {formatINR(bed.rentPaise || room.baseRentPaise)}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (bed.status === 'occupied') {
                const isPaid = bed.paymentStatus === 'PAID';
                return (
                  <View
                    key={bed.bedNumber}
                    className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex-1 min-w-[120px]"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-rose-900">{bed.bedNumber}</Text>
                      <Text
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {bed.paymentStatus}
                      </Text>
                    </View>
                    <Text
                      className="text-xs text-rose-800 font-medium mt-1 truncate"
                      numberOfLines={1}
                    >
                      {bed.tenantName}
                    </Text>
                  </View>
                );
              }

              if (bed.status === 'notice_period') {
                return (
                  <View
                    key={bed.bedNumber}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex-1 min-w-[120px]"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-amber-900">{bed.bedNumber}</Text>
                      <Text className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1 rounded">
                        {bed.daysLeft}d left
                      </Text>
                    </View>
                    <Text
                      className="text-xs text-amber-800 font-medium mt-1 truncate"
                      numberOfLines={1}
                    >
                      {bed.tenantName}
                    </Text>
                  </View>
                );
              }

              return (
                <View
                  key={bed.bedNumber}
                  className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex-1 min-w-[120px]"
                >
                  <Text className="text-xs font-bold text-slate-600">{bed.bedNumber}</Text>
                  <Text className="text-[10px] text-slate-400 mt-1">Maintenance</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* Legend */}
      <View className="flex-row justify-around py-4 mt-2">
        <Text className="text-xs text-emerald-700 font-medium">🟢 Vacant</Text>
        <Text className="text-xs text-rose-700 font-medium">🔴 Occupied</Text>
        <Text className="text-xs text-amber-700 font-medium">🟡 Notice</Text>
        <Text className="text-xs text-slate-500 font-medium">⚪ Repair</Text>
      </View>
    </ScrollView>
  );
}
