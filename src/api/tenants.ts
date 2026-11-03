import { apiClient } from './client';
import { ApiResponse, ITenantListItem } from '../types/api';

export interface FetchTenantsParams {
  propertyId?: string;
  status?: string;
  search?: string;
}

export const fetchTenantsApi = async (params?: FetchTenantsParams): Promise<ITenantListItem[]> => {
  const response = await apiClient.get<ApiResponse<ITenantListItem[]>>('/tenants', {
    params,
  });
  return response.data.data;
};

export const fetchTenantByIdApi = async (id: string) => {
  const response = await apiClient.get(`/tenants/${id}`);
  return response.data.data;
};
