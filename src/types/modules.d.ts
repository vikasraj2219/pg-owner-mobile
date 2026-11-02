declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable?: boolean | null;
    type?: string;
  }

  const NetInfo: {
    fetch: () => Promise<NetInfoState>;
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  };

  export default NetInfo;
}

declare module '@tanstack/react-query-persist-client' {
  import React from 'react';
  import { QueryClient } from '@tanstack/react-query';
  import { Persister } from '@tanstack/query-persist-client-core';

  export interface PersistQueryClientProviderProps {
    client: QueryClient;
    persistOptions: {
      persister: Persister;
      maxAge?: number;
      buster?: string;
    };
    children?: React.ReactNode;
    onSuccess?: () => void;
  }

  export const PersistQueryClientProvider: React.FC<PersistQueryClientProviderProps>;
}

