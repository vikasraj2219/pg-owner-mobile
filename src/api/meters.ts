import { apiClient } from './client';
import { ApiResponse, IMeterReading, Paise } from '../types/api';

/**
 * Record a sub-meter reading and compute per-tenant split in integer paise
 */
export const recordMeterReadingApi = async (payload: {
  propertyId: string;
  roomId: string;
  meterIdentifier?: string;
  previousReading: number;
  currentReading: number;
  ratePaisePerUnit?: Paise;
  splitMethod?: 'equal' | 'by_days_occupied';
}): Promise<IMeterReading> => {
  const response = await apiClient.post<ApiResponse<IMeterReading>>('/meters/reading', payload);
  return response.data.data;
};

/**
 * Fetch past meter readings for property or room
 */
export const getMeterReadingsApi = async (
  propertyId?: string,
  roomId?: string,
): Promise<IMeterReading[]> => {
  const response = await apiClient.get<ApiResponse<IMeterReading[]>>('/meters/readings', {
    params: { propertyId, roomId },
  });
  return response.data.data;
};

/**
 * Get latest meter reading for room to pre-fill previous reading
 */
export const getLatestRoomReadingApi = async (roomId: string): Promise<IMeterReading | null> => {
  const response = await apiClient.get<ApiResponse<IMeterReading | null>>(
    `/meters/room/${roomId}/latest`,
  );
  return response.data.data;
};
