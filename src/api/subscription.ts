import { apiClient } from './client';
import { ApiResponse, ISubscriptionCurrent, ISubscription } from '../types/api';

export interface IRazorpayOrderData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: 'starter' | 'growth' | 'pro';
  planLabel: string;
  isMock: boolean;
  notice?: string;
}

export interface IRazorpayPaymentLinkData {
  paymentLinkId: string;
  paymentLinkUrl: string;
  amount: number;
  currency: string;
  plan: 'starter' | 'growth' | 'pro';
  isMock: boolean;
  notice?: string;
}

export interface IVerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  plan: 'starter' | 'growth' | 'pro';
}

/**
 * Fetch current subscription status, quotas, and usage
 */
export const getCurrentSubscriptionApi = async (): Promise<ISubscriptionCurrent> => {
  const response = await apiClient.get<ApiResponse<ISubscriptionCurrent>>('/subscription/current');
  return response.data.data;
};

/**
 * Create Razorpay Order for Subscription Upgrade
 */
export const createRazorpayOrderApi = async (
  plan: 'starter' | 'growth' | 'pro',
): Promise<IRazorpayOrderData> => {
  const response = await apiClient.post<ApiResponse<IRazorpayOrderData>>(
    '/subscription/create-order',
    { plan },
  );
  return response.data.data;
};

/**
 * Verify Razorpay payment and activate subscription
 */
export const verifyRazorpayPaymentApi = async (
  payload: IVerifyPaymentPayload,
): Promise<ISubscription> => {
  const response = await apiClient.post<ApiResponse<ISubscription>>(
    '/subscription/verify',
    payload,
  );
  return response.data.data;
};

/**
 * Create Razorpay Payment Link (for hosted browser & UPI app intent checkout)
 */
export const createRazorpayPaymentLinkApi = async (
  plan: 'starter' | 'growth' | 'pro',
): Promise<IRazorpayPaymentLinkData> => {
  const response = await apiClient.post<ApiResponse<IRazorpayPaymentLinkData>>(
    '/subscription/payment-link',
    { plan },
  );
  return response.data.data;
};

/**
 * Direct upgrade plan tier (starter -> growth -> pro)
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
 * Schedule plan downgrade to take effect at the end of current billing period
 */
export const scheduleDowngradeApi = async (
  plan: 'starter' | 'growth' | 'pro',
): Promise<ISubscription> => {
  const response = await apiClient.post<ApiResponse<ISubscription>>(
    '/subscription/schedule-downgrade',
    { plan },
  );
  return response.data.data;
};

/**
 * Cancel a scheduled plan downgrade
 */
export const cancelDowngradeApi = async (): Promise<ISubscription> => {
  const response = await apiClient.post<ApiResponse<ISubscription>>(
    '/subscription/cancel-downgrade',
  );
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
