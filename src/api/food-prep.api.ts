import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type {
    IDisplayStockSummaryResponse,
    ICreatePreparedBatchRequest,
    IDisposePreparedBatchRequest,
    IPreparedItemBatch,
    IGetPreparedBatchesParams,
    IPreparedBatchesResult
} from '../feature/food-prep/food-prep.types';

// ==========================================
// FOOD PREPARATION & DISPLAY INVENTORY API
// ==========================================

export const getDisplayStockSummary = async (): Promise<IDisplayStockSummaryResponse> => {
    const response = await api.get('/food-prep/summary');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch display stock summary', response.status, errorData);
    }
    return response.json();
};

export const getPreparedBatches = async (params: IGetPreparedBatchesParams): Promise<IPreparedBatchesResult> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.productVariantId) query.set('productVariantId', params.productVariantId);
    if (params.expiringWithinMinutes !== undefined) query.set('expiringWithinMinutes', String(params.expiringWithinMinutes));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/food-prep/batches?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch prepared food batches', response.status, errorData);
    }
    return response.json();
};

export const createPreparedBatch = async (payload: ICreatePreparedBatchRequest): Promise<IPreparedItemBatch> => {
    const response = await api.post('/food-prep/batches', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to record food preparation batch', response.status, errorData);
    }
    return response.json();
};

export const disposePreparedBatch = async (id: string, payload: IDisposePreparedBatchRequest): Promise<IPreparedItemBatch> => {
    const response = await api.post(`/food-prep/batches/${id}/dispose`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to dispose batch units', response.status, errorData);
    }
    return response.json();
};
