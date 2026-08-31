import { api } from './api';
import { ApiError } from '../utils/error-handler';

export const getDashboardSummary = async (dateFrom?: string, dateTo?: string): Promise<any> => {
    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/dashboard/summary${qs}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch dashboard summary metrics', response.status, errorData);
    }
    return response.json();
};
