import { apiClient } from './client';
import {
  ApiResponse,
  IProperty,
  IRoom,
  IBed,
  PropertyMatrixData,
  CreatePropertyPayload,
  UpdatePropertyPayload,
  CreateRoomPayload,
  UpdateRoomPayload,
  AddBedPayload,
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
 * Fetch all rooms for a property
 */
export const fetchPropertyRooms = async (propertyId: string): Promise<IRoom[]> => {
  const response = await apiClient.get<ApiResponse<IRoom[]>>(`/properties/${propertyId}/rooms`);
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
 * Update property details
 */
export const updatePropertyApi = async (
  propertyId: string,
  payload: UpdatePropertyPayload,
): Promise<IProperty> => {
  const response = await apiClient.put<ApiResponse<IProperty>>(
    `/properties/${propertyId}`,
    payload,
  );
  return response.data.data;
};

/**
 * Delete property (only if no occupied beds)
 */
export const deletePropertyApi = async (propertyId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/properties/${propertyId}`);
};

/**
 * Update room details (roomNumber, floorNumber, rent, sharing capacity, tags)
 */
export const updateRoomApi = async (
  propertyId: string,
  roomId: string,
  payload: UpdateRoomPayload,
): Promise<IRoom> => {
  const response = await apiClient.put<ApiResponse<IRoom>>(
    `/properties/${propertyId}/rooms/${roomId}`,
    payload,
  );
  return response.data.data;
};

/**
 * Delete room (only if all beds are vacant)
 */
export const deleteRoomApi = async (propertyId: string, roomId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/properties/${propertyId}/rooms/${roomId}`);
};

/**
 * Add a new bed to an existing room
 */
export const addBedToRoomApi = async (
  propertyId: string,
  roomId: string,
  payload?: AddBedPayload,
): Promise<IBed> => {
  const response = await apiClient.post<ApiResponse<IBed>>(
    `/properties/${propertyId}/rooms/${roomId}/beds`,
    payload || {},
  );
  return response.data.data;
};

/**
 * Delete a vacant bed
 */
export const deleteBedApi = async (bedId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/beds/${bedId}`);
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
