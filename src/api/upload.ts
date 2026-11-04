import { apiClient } from './client';
import { ApiResponse } from '../types/api';

export interface UploadResponseData {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  resourceType: string;
  originalName: string;
}

export interface UploadStatusData {
  isConfigured: boolean;
  provider: string;
  maxFileSizeMb: number;
  allowedFormats: string[];
}

/**
 * Uploads a KYC document or ID proof to Cloudinary via backend multipart endpoint
 */
export const uploadKycDocumentApi = async (
  fileUri: string,
  fileName = 'id_proof.jpg',
  mimeType = 'image/jpeg',
): Promise<UploadResponseData> => {
  const formData = new FormData();

  // In React Native, FormData accepts an object with uri, name, and type
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await apiClient.post<ApiResponse<UploadResponseData>>('/uploads/kyc', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: data => data, // Prevent axios from transforming FormData
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to upload document to Cloudinary');
  }

  return response.data.data;
};

/**
 * Check Cloudinary storage availability
 */
export const getUploadStatusApi = async (): Promise<UploadStatusData> => {
  const response = await apiClient.get<ApiResponse<UploadStatusData>>('/uploads/status');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to check storage status');
  }
  return response.data.data;
};
