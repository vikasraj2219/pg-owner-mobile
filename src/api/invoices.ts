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

export interface InvoiceLineItemPayload {
  description: string;
  amountPaise: number;
  category: 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage';
}

export interface CreateManualInvoicePayload {
  tenantId: string;
  propertyId?: string;
  dueDate: string;
  month?: number;
  year?: number;
  items: InvoiceLineItemPayload[];
}

export interface UpdateInvoicePayload {
  dueDate?: string;
  items?: InvoiceLineItemPayload[];
  status?: 'unpaid' | 'partially_paid' | 'paid' | 'canceled';
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

export const createManualInvoiceApi = async (
  payload: CreateManualInvoicePayload,
): Promise<DueInvoiceItem> => {
  const response = await apiClient.post<ApiResponse<DueInvoiceItem>>('/invoices', payload);
  return response.data.data;
};

export const updateInvoiceApi = async (
  id: string,
  payload: UpdateInvoicePayload,
): Promise<DueInvoiceItem> => {
  const response = await apiClient.put<ApiResponse<DueInvoiceItem>>(`/invoices/${id}`, payload);
  return response.data.data;
};

export const deleteInvoiceApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/invoices/${id}`);
};
