import { apiClient } from './client';
import {
  ApiResponse,
  IProperty,
  IRoom,
  IBed,
  PropertyMatrixData,
  CreatePropertyPayload,
  CreateRoomPayload,
  UpdateBedStatusPayload,
} from '../types/api';

/**
 * Fetch all properties for the authenticated organization
 */
export const fetchProperties = async (): Promise<IProperty[]> => {
  const response = await apiClient.get<ApiResponse<IProperty[]>>('/properties');
  return response.data.data;
};

/**
 * Fetch single property details
 */
export const fetchPropertyById = async (propertyId: string): Promise<IProperty> => {
  const response = await apiClient.get<ApiResponse<IProperty>>(`/properties/${propertyId}`);
  return response.data.data;
};

/**
 * Fetch visual bed matrix (floors, rooms, beds) for a specific property
 */
export const fetchPropertyMatrix = async (propertyId: string): Promise<PropertyMatrixData> => {
  const response = await apiClient.get<ApiResponse<PropertyMatrixData>>(
    `/properties/${propertyId}/matrix`,
  );
  return response.data.data;
};

/**
 * Create a new property
 */
export const createProperty = async (payload: CreatePropertyPayload): Promise<IProperty> => {
  const response = await apiClient.post<ApiResponse<IProperty>>('/properties', payload);
  return response.data.data;
};

/**
 * Create a room and auto-generate bed chips inside a property
 */
export const createRoom = async (
  propertyId: string,
  payload: CreateRoomPayload,
): Promise<IRoom> => {
  const response = await apiClient.post<ApiResponse<IRoom>>(
    `/properties/${propertyId}/rooms`,
    payload,
  );
  return response.data.data;
};

/**
 * Update the status of a specific bed (available, maintenance, notice_period)
 */
export const updateBedStatus = async (
  bedId: string,
  payload: UpdateBedStatusPayload,
): Promise<IBed> => {
  const response = await apiClient.put<ApiResponse<IBed>>(`/beds/${bedId}/status`, payload);
  return response.data.data;
};
