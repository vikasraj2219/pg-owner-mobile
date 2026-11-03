import { useQuery } from '@tanstack/react-query';
import { fetchTenantsApi, fetchTenantByIdApi, FetchTenantsParams } from '../api/tenants';
import { ITenantListItem, ITenantDetailData } from '../types/api';

export function useTenants(params?: FetchTenantsParams) {
  const query = useQuery<ITenantListItem[]>({
    queryKey: [
      'tenants',
      params?.propertyId || 'all',
      params?.status || 'all',
      params?.search || '',
    ],
    queryFn: () => fetchTenantsApi(params),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: 'always',
  });

  return {
    tenants: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}

export function useTenantDetail(tenantId?: string) {
  const query = useQuery<ITenantDetailData>({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => fetchTenantByIdApi(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  return {
    data: query.data,
    tenant: query.data?.tenant,
    invoices: query.data?.invoices || [],
    deposits: query.data?.deposits || [],
    bedHistory: query.data?.bedHistory || [],
    payments: query.data?.payments || [],
    balanceDuePaise: query.data?.balanceDuePaise || 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
