import { apiClient } from './client';
import { ApiResponse, DueInvoiceItem, MarkPaidResponseData } from '../types/api';

export const fetchInvoicesApi = async (params?: {
  propertyId?: string;
  status?: 'all' | 'overdue' | 'unpaid' | 'paid';
  search?: string;
}): Promise<DueInvoiceItem[]> => {
  const response = await apiClient.get<ApiResponse<DueInvoiceItem[]>>('/invoices', {
    params: {
      propertyId: params?.propertyId,
      status: params?.status === 'all' ? undefined : params?.status,
      search: params?.search,
    },
  });
  return response.data.data;
};

export interface MarkPaidPayload {
  invoiceId: string;
  amountPaise?: number;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  notes?: string;
}

export const markInvoicePaidApi = async (
  payload: MarkPaidPayload,
): Promise<MarkPaidResponseData> => {
  const response = await apiClient.post<ApiResponse<MarkPaidResponseData>>(
    `/invoices/${payload.invoiceId}/pay`,
    {
      amountPaise: payload.amountPaise,
      paymentMethod: payload.paymentMethod || 'upi',
      transactionReference: payload.transactionReference,
      notes: payload.notes,
    },
  );
  return response.data.data;
};
