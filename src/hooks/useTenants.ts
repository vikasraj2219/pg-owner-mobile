import { useQuery } from '@tanstack/react-query';
import { fetchTenantsApi, FetchTenantsParams } from '../api/tenants';
import { ITenantListItem } from '../types/api';

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
