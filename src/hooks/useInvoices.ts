import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInvoicesApi, markInvoicePaidApi } from '../api/invoices';
import { DueInvoiceItem } from '../types/api';

export function useInvoices(
  propertyId?: string | null,
  status?: 'all' | 'overdue' | 'unpaid' | 'paid',
) {
  const queryClient = useQueryClient();

  const query = useQuery<DueInvoiceItem[]>({
    queryKey: ['invoices', propertyId || 'all', status || 'all'],
    queryFn: () =>
      fetchInvoicesApi({
        propertyId: propertyId || undefined,
        status,
      }),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: 'always',
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ invoiceId, amountPaise }: { invoiceId: string; amountPaise?: number }) =>
      markInvoicePaidApi(invoiceId, amountPaise),
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

