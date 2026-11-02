import { apiClient } from './client';
import { ApiResponse, DueInvoiceItem } from '../types/api';

export const fetchInvoicesApi = async (params?: {
  propertyId?: string;
  status?: 'all' | 'overdue' | 'unpaid' | 'paid';
}): Promise<DueInvoiceItem[]> => {
  const response = await apiClient.get<ApiResponse<DueInvoiceItem[]>>('/invoices', {
    params: {
      propertyId: params?.propertyId,
      status: params?.status === 'all' ? undefined : params?.status,
    },
  });
  return response.data.data;
};

export const markInvoicePaidApi = async (
  invoiceId: string,
  amountPaise?: number,
): Promise<DueInvoiceItem> => {
  const response = await apiClient.post<ApiResponse<DueInvoiceItem>>(`/invoices/${invoiceId}/pay`, {
    amountPaise,
  });
  return response.data.data;
};
