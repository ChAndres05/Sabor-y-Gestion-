const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import type { DashboardData } from '../mocks/dashboard.mock';

export const dashboardApi = {
  async getDashboardData(
    type: 'hoy' | 'rango' | 'mes',
    startDate?: string,
    endDate?: string
  ): Promise<DashboardData> {
    let url = `${API_URL}/api/admin/dashboard?type=${type}`;
    if (type === 'rango' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener datos del dashboard');
    }

    return res.json() as Promise<DashboardData>;
  },
};
