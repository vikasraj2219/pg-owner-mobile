import { apiClient } from './client';
import { ApiResponse } from '../types/api';

/**
 * Mark tenant and assigned bed on notice period
 */
export const setTenantNoticeApi = async (
  tenantId: string,
  payload: {
    expectedVacateDate: string;
    notes?: string;
  },
): Promise<{ tenantId: string; status: string; noticeEndDate: string }> => {
  const response = await apiClient.post<
    ApiResponse<{ tenantId: string; status: string; noticeEndDate: string }>
  >(`/tenants/${tenantId}/notice`, payload);
  return response.data.data;
};

/**
 * Cancel notice period and restore bed to occupied
 */
export const cancelTenantNoticeApi = async (
  tenantId: string,
): Promise<{ tenantId: string; status: string }> => {
  const response = await apiClient.post<ApiResponse<{ tenantId: string; status: string }>>(
    `/tenants/${tenantId}/cancel-notice`,
  );
  return response.data.data;
};
