import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStatsApi } from '../api/dashboard';
import { DashboardStats } from '../types/api';

export function useDashboard(propertyId?: string | null) {
  const query = useQuery<DashboardStats>({
    queryKey: ['dashboard', propertyId || 'all'],
    queryFn: () =>
      fetchDashboardStatsApi(propertyId === 'all' || !propertyId ? undefined : propertyId),
    staleTime: 1000 * 60 * 2, // 2 minutes cache validity
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
