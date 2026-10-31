import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProperties, createProperty as createPropertyApi } from '../api/properties';
import { IProperty, CreatePropertyPayload } from '../types/api';

const SELECTED_PROPERTY_KEY = 'selected_property_id';

interface PropertyContextType {
  properties: IProperty[];
  selectedProperty: IProperty | null;
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  refetchProperties: () => void;
  createPropertyMutation: (payload: CreatePropertyPayload) => Promise<IProperty>;
  isCreating: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string | null>(null);

  const {
    data: properties = [],
    isLoading,
    isError,
    refetch: refetchProperties,
  } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Restore stored selected property id on load
  useEffect(() => {
    const loadSelected = async () => {
      try {
        const stored = await AsyncStorage.getItem(SELECTED_PROPERTY_KEY);
        if (stored) {
          setSelectedPropertyIdState(stored);
        }
      } catch (_err) {
        // Fallback to memory
      }
    };
    loadSelected();
  }, []);

  // When properties list is available, ensure a valid selectedPropertyId is set
  useEffect(() => {
    if (properties.length > 0) {
      if (!selectedPropertyId || !properties.some(p => p._id === selectedPropertyId)) {
        const defaultId = properties[0]._id;
        setSelectedPropertyIdState(defaultId);
        AsyncStorage.setItem(SELECTED_PROPERTY_KEY, defaultId).catch(() => {});
      }
    } else {
      setSelectedPropertyIdState(null);
    }
  }, [properties, selectedPropertyId]);

  const setSelectedPropertyId = async (id: string) => {
    setSelectedPropertyIdState(id);
    try {
      await AsyncStorage.setItem(SELECTED_PROPERTY_KEY, id);
    } catch (_err) {
      // Ignore storage error
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreatePropertyPayload) => createPropertyApi(payload),
    onSuccess: newProperty => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSelectedPropertyId(newProperty._id);
    },
  });

  const selectedProperty =
    properties.find(p => p._id === selectedPropertyId) ||
    (properties.length > 0 ? properties[0] : null);

  return (
    <PropertyContext.Provider
      value={{
        properties,
        selectedProperty,
        selectedPropertyId: selectedProperty?._id || selectedPropertyId,
        setSelectedPropertyId,
        isLoading,
        isError,
        refetchProperties,
        createPropertyMutation: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = (): PropertyContextType => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
};
