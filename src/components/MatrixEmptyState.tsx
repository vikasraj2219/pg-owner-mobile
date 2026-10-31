import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';

interface MatrixEmptyStateProps {
  onAddRoom: () => void;
}

export const MatrixEmptyState: React.FC<MatrixEmptyStateProps> = ({ onAddRoom }) => {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {/* Dashed Grid Icon matching Page 49 */}
      <View className="mb-6 items-center justify-center">
        <Svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <Rect
            x="4"
            y="4"
            width="42"
            height="42"
            rx="12"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <Rect
            x="54"
            y="4"
            width="42"
            height="42"
            rx="12"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <Rect
            x="4"
            y="54"
            width="42"
            height="42"
            rx="12"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <Rect
            x="54"
            y="54"
            width="42"
            height="42"
            rx="12"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
        </Svg>
      </View>

      <Text className="text-2xl font-black text-slate-900 text-center mb-2">No rooms yet</Text>
      <Text className="text-sm font-medium text-slate-500 text-center mb-8 leading-relaxed max-w-[280px]">
        Add your first room. Beds are created automatically.
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onAddRoom}
        className="w-full bg-[#0A6C50] rounded-2xl py-4 flex-row items-center justify-center shadow-sm"
      >
        <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text className="text-base font-extrabold text-white ml-2">Add your first room</Text>
      </TouchableOpacity>
    </View>
  );
};
