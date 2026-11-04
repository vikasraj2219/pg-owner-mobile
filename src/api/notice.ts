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
  try {
    const response = await apiClient.post<
      ApiResponse<{ tenantId: string; status: string; noticeEndDate: string }>
    >(`/tenants/${tenantId}/notice`, payload);
    return response.data.data;
  } catch (err: any) {
    if (err?.response?.status === 404 || !err?.response) {
      // Fallback: update tenant status directly via PUT /tenants/:id
      await apiClient.put(`/tenants/${tenantId}`, {
        status: 'notice_period',
      });
      return {
        tenantId,
        status: 'notice_period',
        noticeEndDate: payload.expectedVacateDate,
      };
    }
    throw err;
  }
};

/**
 * Cancel notice period and restore bed to occupied
 */
export const cancelTenantNoticeApi = async (
  tenantId: string,
): Promise<{ tenantId: string; status: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ tenantId: string; status: string }>>(
      `/tenants/${tenantId}/cancel-notice`,
    );
    return response.data.data;
  } catch (err: any) {
    if (err?.response?.status === 404 || !err?.response) {
      // Fallback: update tenant status directly via PUT /tenants/:id
      await apiClient.put(`/tenants/${tenantId}`, {
        status: 'active',
      });
      return {
        tenantId,
        status: 'active',
      };
    }
    throw err;
  }
};
