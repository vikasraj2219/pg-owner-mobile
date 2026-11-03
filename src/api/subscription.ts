import { apiClient } from './client';
import { ApiResponse, ISubscriptionCurrent, ISubscription } from '../types/api';

/**
 * Fetch current subscription status, quotas, and usage
 */
export const getCurrentSubscriptionApi = async (): Promise<ISubscriptionCurrent> => {
  const response = await apiClient.get<ApiResponse<ISubscriptionCurrent>>('/subscription/current');
  return response.data.data;
};

/**
 * Upgrade plan tier (starter -> growth -> pro)
 */
export const upgradeSubscriptionApi = async (
  plan: 'starter' | 'growth' | 'pro',
): Promise<ISubscription> => {
  const response = await apiClient.post<ApiResponse<ISubscription>>('/subscription/upgrade', {
    plan,
  });
  return response.data.data;
};

/**
 * Extend trial days
 */
export const extendTrialApi = async (days: number): Promise<ISubscription> => {
  const response = await apiClient.post<ApiResponse<ISubscription>>('/subscription/extend-trial', {
    days,
  });
  return response.data.data;
};
