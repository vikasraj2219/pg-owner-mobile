import { apiClient } from './client';
import { ApiResponse, DashboardStats } from '../types/api';

export const fetchDashboardStatsApi = async (propertyId?: string): Promise<DashboardStats> => {
  const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', {
    params: { propertyId },
  });
  return response.data.data;
};
