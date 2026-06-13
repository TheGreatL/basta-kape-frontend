import { api } from './api';
import { ApiError } from '../utils/error-handler';

export const getDashboardSummary = async (): Promise<any> => {
    const response = await api.get('/dashboard/summary');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch dashboard summary metrics', response.status, errorData);
    }
    return response.json();
};
