import { apiClient } from './client';
import { ApiResponse, DashboardStats } from '../types/api';

export const fetchDashboardStatsApi = async (propertyId?: string): Promise<DashboardStats> => {
  // 1. Attempt the server endpoint first
  try {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', {
      params: propertyId ? { propertyId } : undefined,
    });
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      if (data.totalBeds > 0 || data.totalRooms > 0) {
        return data;
      }
    }
  } catch (_err) {
    // If endpoint is unavailable (e.g. 404 or network issue), fall through to robust client aggregation
  }

  // 2. Resilient Fallback: Pull directly from property matrix or properties list
  try {
    if (propertyId) {
      const matrixRes = await apiClient.get(`/properties/${propertyId}/matrix`);
      if (matrixRes.data?.success && matrixRes.data?.data) {
        const matrixData = matrixRes.data.data;
        const summary = matrixData.summary || {};

        let tenantsCount = summary.occupiedBeds || 0;
        let expectedRentPaise = 0;
        try {
          const tenantsRes = await apiClient.get('/tenants', { params: { propertyId } });
          const tenantsList = tenantsRes.data?.data || [];
          tenantsCount = tenantsList.length;
          expectedRentPaise = tenantsList.reduce(
            (acc: number, t: { monthlyRentPaise?: number }) => acc + (t.monthlyRentPaise || 0),
            0,
          );
        } catch {
          // ignore tenants error
        }

        return {
          totalRooms: summary.totalRooms || 0,
          totalBeds: summary.totalBeds || 0,
          occupiedBeds: summary.occupiedBeds || 0,
          availableBeds: summary.availableBeds || 0,
          maintenanceBeds: summary.maintenanceBeds || 0,
          noticeBeds: summary.noticePeriodBeds || 0,
          occupancyRate: summary.occupancyRate || 0,
          collectedThisMonthPaise: 0,
          expectedThisMonthPaise: expectedRentPaise,
          pendingAmountPaise: expectedRentPaise,
          collectionRate: 0,
          overdueCount: 0,
          overdueAmountPaise: 0,
          netProfitPaise: 0,
          totalTenants: tenantsCount,
          recentActivity: [],
        };
      }
    }

    // When all properties are selected (or propertyId is not passed)
    const propsRes = await apiClient.get('/properties');
    if (propsRes.data?.success && Array.isArray(propsRes.data?.data)) {
      const props = propsRes.data.data;
      let totalRooms = 0;
      let totalBeds = 0;
      let occupiedBeds = 0;
      let availableBeds = 0;

      for (const p of props) {
        if (p.stats) {
          totalRooms += p.stats.totalRooms || 0;
          totalBeds += p.stats.totalBeds || 0;
          occupiedBeds += p.stats.occupiedBeds || 0;
          availableBeds += p.stats.availableBeds || 0;
        }
      }

      let tenantsCount = occupiedBeds;
      let expectedRentPaise = 0;
      try {
        const tenantsRes = await apiClient.get('/tenants');
        const tenantsList = tenantsRes.data?.data || [];
        tenantsCount = tenantsList.length;
        expectedRentPaise = tenantsList.reduce(
          (acc: number, t: { monthlyRentPaise?: number }) => acc + (t.monthlyRentPaise || 0),
          0,
        );
      } catch {
        // ignore tenants error
      }

      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      return {
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds: 0,
        noticeBeds: 0,
        occupancyRate,
        collectedThisMonthPaise: 0,
        expectedThisMonthPaise: expectedRentPaise,
        pendingAmountPaise: expectedRentPaise,
        collectionRate: 0,
        overdueCount: 0,
        overdueAmountPaise: 0,
        netProfitPaise: 0,
        totalTenants: tenantsCount,
        recentActivity: [],
      };
    }
  } catch (_fallbackErr) {
    // Both attempts failed
  }

  // Safe zeroed default only if completely empty
  return {
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    maintenanceBeds: 0,
    noticeBeds: 0,
    occupancyRate: 0,
    collectedThisMonthPaise: 0,
    expectedThisMonthPaise: 0,
    pendingAmountPaise: 0,
    collectionRate: 0,
    overdueCount: 0,
    overdueAmountPaise: 0,
    netProfitPaise: 0,
    totalTenants: 0,
    recentActivity: [],
  };
};
