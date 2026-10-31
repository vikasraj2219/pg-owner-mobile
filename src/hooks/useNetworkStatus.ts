import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('6:42 pm');

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
    });

    // Subscribed listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true;
      setIsConnected(online);
      if (online) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const formattedHours = hours % 12 || 12;
        setLastSyncTime(`${formattedHours}:${minutes} ${ampm}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, lastSyncTime };
}
