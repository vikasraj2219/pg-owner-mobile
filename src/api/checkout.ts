import { apiClient } from './client';
import {
  ApiResponse,
  CheckoutPreviewData,
  CheckoutConfirmPayload,
  ISettlementStatement,
} from '../types/api';

/**
 * Fetch checkout preview breakdown (deposits, unpaid invoices, damage deductions)
 */
export const getCheckoutPreviewApi = async (tenantId: string): Promise<CheckoutPreviewData> => {
  const response = await apiClient.get<ApiResponse<CheckoutPreviewData>>(
    `/checkouts/preview/${tenantId}`,
  );
  return response.data.data;
};

/**
 * Confirm checkout and generate settlement statement atomically
 */
export const confirmCheckoutApi = async (
  payload: CheckoutConfirmPayload,
): Promise<{ settlement: ISettlementStatement; tenantId: string; status: string }> => {
  const response = await apiClient.post<
    ApiResponse<{ settlement: ISettlementStatement; tenantId: string; status: string }>
  >('/checkouts/confirm', payload);
  return response.data.data;
};

/**
 * Fetch all settlement statements scoped to organization
 */
export const getSettlementStatementsApi = async (
  propertyId?: string,
): Promise<ISettlementStatement[]> => {
  const response = await apiClient.get<ApiResponse<ISettlementStatement[]>>(
    '/checkouts/statements',
    { params: { propertyId } },
  );
  return response.data.data;
};
