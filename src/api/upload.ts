import * as FileSystem from 'expo-file-system';
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
 * Uploads a KYC document or ID proof to Cloudinary via backend endpoint
 */
export const uploadKycDocumentApi = async (
  fileUri: string,
  fileName = 'id_proof.jpg',
  mimeType = 'image/jpeg',
): Promise<UploadResponseData> => {
  let base64Data: string | null = null;

  if (fileUri.startsWith('data:')) {
    base64Data = fileUri;
  } else {
    try {
      // Read local file as base64 using expo-file-system
      const rawBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64Data = `data:${mimeType};base64,${rawBase64}`;
    } catch {
      // If file system read fails, try FormData upload
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);

      const fdResponse = await apiClient.post<ApiResponse<UploadResponseData>>(
        '/uploads/kyc',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: data => data,
        },
      );

      if (!fdResponse.data.success || !fdResponse.data.data) {
        throw new Error(fdResponse.data.message || 'Failed to upload document to Cloudinary');
      }

      return fdResponse.data.data;
    }
  }

  // Upload base64 JSON directly to backend Cloudinary upload endpoint
  const response = await apiClient.post<ApiResponse<UploadResponseData>>('/uploads/kyc', {
    file: base64Data,
    originalName: fileName,
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
