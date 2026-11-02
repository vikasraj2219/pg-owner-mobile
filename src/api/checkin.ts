import { apiClient } from './client';
import {
  ApiResponse,
  QuickCheckinPayload,
  QuickCheckinResponseData,
  ITenant,
  IInvoice,
} from '../types/api';

/**
 * Execute transactional quick check-in
 * Atomically creates tenant, marks bed occupied, generates prorated invoice, logs security deposit
 */
export const quickCheckinApi = async (
  payload: QuickCheckinPayload,
): Promise<QuickCheckinResponseData> => {
  const response = await apiClient.post<ApiResponse<QuickCheckinResponseData>>(
    '/checkins/quick',
    payload,
  );
  return response.data.data;
};

/**
 * Fetch all tenants scoped to the authenticated organization
 */
export const getTenantsApi = async (params?: {
  propertyId?: string;
  status?: string;
  search?: string;
}): Promise<ITenant[]> => {
  const response = await apiClient.get<ApiResponse<ITenant[]>>('/tenants', {
    params,
  });
  return response.data.data;
};

/**
 * Fetch detailed tenant profile including invoices, deposit records, and bed assignment history
 */
export const getTenantByIdApi = async (
  tenantId: string,
): Promise<{
  tenant: ITenant;
  invoices: IInvoice[];
  deposits: Array<Record<string, unknown>>;
  bedHistory: Array<Record<string, unknown>>;
}> => {
  const response = await apiClient.get<
    ApiResponse<{
      tenant: ITenant;
      invoices: IInvoice[];
      deposits: Array<Record<string, unknown>>;
      bedHistory: Array<Record<string, unknown>>;
    }>
  >(`/tenants/${tenantId}`);
  return response.data.data;
};
