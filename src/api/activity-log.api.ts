import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type { IActivityLog, IGetActivityLogsParams } from '../feature/activity-log/activity-log.types';

export const getActivityLogs = async (params: IGetActivityLogsParams): Promise<IPaginatedResult<IActivityLog>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);

    const response = await api.get(`/activity-logs?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch activity logs list', response.status, errorData);
    }
    return response.json();
};
