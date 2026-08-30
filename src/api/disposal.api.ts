import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IDisposalSummary, IGetDisposalsParams, IGetDisposalSummaryParams, IDisposalsResult } from '../feature/disposal/disposal.types';

// ==========================================
// UNIFIED DISPOSAL & WASTE MANAGEMENT API
// ==========================================

export const getDisposalSummary = async (params?: IGetDisposalSummaryParams): Promise<IDisposalSummary> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.reason && params.reason !== 'ALL') query.set('reason', params.reason);
    if (params?.search) query.set('search', params.search);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const response = await api.get(`/disposals/summary?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch disposal financial loss summary', response.status, errorData);
    }
    return response.json();
};

export const getDisposals = async (params: IGetDisposalsParams): Promise<IDisposalsResult> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.reason && params.reason !== 'ALL') query.set('reason', params.reason);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const response = await api.get(`/disposals?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch unified waste and disposal logs', response.status, errorData);
    }
    return response.json();
};
