import { apiClient } from './client';
import { ApiResponse, IExpense, IPnLSummary, Paise } from '../types/api';

/**
 * Record a new operational expense in integer paise
 */
export const createExpenseApi = async (payload: {
  propertyId?: string;
  category: string;
  amountPaise: Paise;
  description: string;
  paidTo?: string;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer';
}): Promise<IExpense> => {
  const response = await apiClient.post<ApiResponse<IExpense>>('/expenses', payload);
  return response.data.data;
};

/**
 * Fetch expenses with optional filters
 */
export const getExpensesApi = async (params?: {
  propertyId?: string;
  category?: string;
}): Promise<{ expenses: IExpense[]; count: number; totalExpensesPaise: Paise }> => {
  const response = await apiClient.get<
    ApiResponse<{ expenses: IExpense[]; count: number; totalExpensesPaise: Paise }>
  >('/expenses', { params });
  return response.data.data;
};

/**
 * Fetch Live Profit & Loss summary (Collections - Expenses = Net Cashflow)
 */
export const getPnLSummaryApi = async (params?: {
  propertyId?: string;
  month?: number;
  year?: number;
}): Promise<IPnLSummary> => {
  const response = await apiClient.get<ApiResponse<IPnLSummary>>('/expenses/pnl', { params });
  return response.data.data;
};

/**
 * Delete expense
 */
export const deleteExpenseApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/expenses/${id}`);
};
