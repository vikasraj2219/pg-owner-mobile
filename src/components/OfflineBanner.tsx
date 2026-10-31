import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isConnected, lastSyncTime } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View className="bg-[#1E293B] px-4 py-2.5 flex-row items-center justify-between border-b border-slate-700">
      <View className="flex-row items-center flex-1 mr-2">
        <WifiOff size={15} color="#94A3B8" />
        <Text className="text-xs text-slate-200 font-medium ml-2" numberOfLines={1}>
          Offline. Showing last saved data
        </Text>
      </View>
      <Text className="text-xs text-slate-400 font-medium">Synced {lastSyncTime}</Text>
    </View>
  );
};
