import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInvoicesApi, markInvoicePaidApi, MarkPaidPayload } from '../api/invoices';
import { DueInvoiceItem, MarkPaidResponseData } from '../types/api';

export function useInvoices(
  propertyId?: string | null,
  status?: 'all' | 'overdue' | 'unpaid' | 'paid',
  search?: string,
) {
  const queryClient = useQueryClient();

  const query = useQuery<DueInvoiceItem[]>({
    queryKey: ['invoices', propertyId || 'all', status || 'all', search || ''],
    queryFn: () =>
      fetchInvoicesApi({
        propertyId: propertyId || undefined,
        status,
        search,
      }),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: 'always',
  });

  const markPaidMutation = useMutation<MarkPaidResponseData, Error, MarkPaidPayload>({
    mutationFn: (payload: MarkPaidPayload) => markInvoicePaidApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['matrix'] });
    },
  });

  return {
    invoices: query.data || [],
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
    markPaid: markPaidMutation.mutateAsync,
    isMarkingPaid: markPaidMutation.isPending,
  };
}
