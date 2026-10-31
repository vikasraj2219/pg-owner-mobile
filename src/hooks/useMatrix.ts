import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPropertyMatrix,
  createRoom as createRoomApi,
  updateBedStatus as updateBedStatusApi,
} from '../api/properties';
import {
  PropertyMatrixData,
  CreateRoomPayload,
  UpdateBedStatusPayload,
  IRoom,
  IBed,
} from '../types/api';

export function useMatrix(propertyId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<PropertyMatrixData>({
    queryKey: ['matrix', propertyId],
    queryFn: () => {
      if (!propertyId) throw new Error('No property selected');
      return fetchPropertyMatrix(propertyId);
    },
    enabled: !!propertyId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const createRoomMutation = useMutation<IRoom, Error, CreateRoomPayload>({
    mutationFn: (payload: CreateRoomPayload) => {
      if (!propertyId) throw new Error('No property selected');
      return createRoomApi(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const updateBedStatusMutation = useMutation<
    IBed,
    Error,
    { bedId: string; payload: UpdateBedStatusPayload }
  >({
    mutationFn: ({ bedId, payload }) => updateBedStatusApi(bedId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  return {
    ...query,
    matrixData: query.data,
    createRoom: createRoomMutation.mutateAsync,
    isCreatingRoom: createRoomMutation.isPending,
    updateBedStatus: updateBedStatusMutation.mutateAsync,
    isUpdatingBedStatus: updateBedStatusMutation.isPending,
  };
}
