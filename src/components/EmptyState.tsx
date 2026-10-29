import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <Text className="text-lg font-semibold text-slate-700 text-center mb-2">{title}</Text>
      <Text className="text-sm text-slate-400 text-center leading-relaxed">{description}</Text>
    </View>
  );
};
