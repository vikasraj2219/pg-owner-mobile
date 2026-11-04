import { apiClient } from './client';
import { ApiResponse, ITenantListItem, ITenantDetailData, Paise } from '../types/api';

export interface FetchTenantsParams {
  propertyId?: string;
  status?: string;
  search?: string;
}

export interface UpdateTenantPayload {
  fullName?: string;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  monthlyRentPaise?: Paise;
  depositPaise?: Paise;
  kycMaskedNumber?: string;
  kycDocUrl?: string;
}

export interface MoveBedPayload {
  newBedId: string;
  notes?: string;
}

export interface NoticePayload {
  expectedVacateDate: string;
  notes?: string;
}

export interface VacatePayload {
  deductionsPaise?: Paise;
  refundPaise?: Paise;
  paymentMethod?: string;
  notes?: string;
}

export const fetchTenantsApi = async (params?: FetchTenantsParams): Promise<ITenantListItem[]> => {
  const response = await apiClient.get<ApiResponse<ITenantListItem[]>>('/tenants', {
    params,
  });
  return response.data.data;
};

export const fetchTenantByIdApi = async (id: string): Promise<ITenantDetailData> => {
  const response = await apiClient.get<ApiResponse<ITenantDetailData>>(`/tenants/${id}`);
  return response.data.data;
};

export const updateTenantApi = async (
  id: string,
  payload: UpdateTenantPayload,
): Promise<ITenantListItem> => {
  const response = await apiClient.put<ApiResponse<ITenantListItem>>(`/tenants/${id}`, payload);
  return response.data.data;
};

export const moveBedApi = async (
  id: string,
  payload: MoveBedPayload,
): Promise<{ tenantId: string; newBedId: string; bedNumber: string }> => {
  const response = await apiClient.post<
    ApiResponse<{ tenantId: string; newBedId: string; bedNumber: string }>
  >(`/tenants/${id}/move-bed`, payload);
  return response.data.data;
};

export const deleteTenantApi = async (
  id: string,
): Promise<{ canDelete: boolean; message: string; data?: any }> => {
  const response = await apiClient.delete<ApiResponse<any>>(`/tenants/${id}`);
  return {
    canDelete: response.data.success,
    message: response.data.message || 'Tenant deleted',
    data: response.data.data,
  };
};

export const restoreTenantApi = async (id: string): Promise<ITenantListItem> => {
  const response = await apiClient.post<ApiResponse<ITenantListItem>>(`/tenants/${id}/restore`);
  return response.data.data;
};

export { setTenantNoticeApi, cancelTenantNoticeApi } from './notice';

export const vacateTenantApi = async (id: string, payload: VacatePayload): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(`/tenants/${id}/vacate`, payload);
  return response.data.data;
};
