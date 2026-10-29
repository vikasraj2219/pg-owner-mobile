import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1">
      <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</Text>
      <Text className="text-xl font-bold text-slate-900 mt-1">{value}</Text>
      {subtitle && <Text className="text-xs text-slate-400 mt-1">{subtitle}</Text>}
    </View>
  );
};
