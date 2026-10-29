import { apiClient } from './client';
import {
  AuthResponseData,
  RegisterOwnerPayload,
  LoginPayload,
  IUser,
  IOrganization,
  ISubscription,
} from '../types/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const registerOwnerApi = async (
  payload: RegisterOwnerPayload,
): Promise<AuthResponseData> => {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>(
    '/auth/register-owner',
    payload,
  );
  return response.data.data;
};

export const loginApi = async (payload: LoginPayload): Promise<AuthResponseData> => {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
  return response.data.data;
};

export const getMeApi = async (): Promise<{
  user: IUser;
  organization: IOrganization;
  subscription: ISubscription | null;
}> => {
  const response = await apiClient.get<
    ApiResponse<{
      user: IUser;
      organization: IOrganization;
      subscription: ISubscription | null;
    }>
  >('/auth/me');
  return response.data.data;
};
