import { api } from './api';
import { ApiError } from '#/utils/error-handler.ts';
import type { IPaginatedResult } from '#/types/base.types.ts';
import type {
    IUnitConversion,
    IGetUnitConversionsParams,
    ICreateUnitConversionPayload,
    IUpdateUnitConversionPayload,
    IConvertQuantityParams,
    IConvertQuantityResponse
} from '#/feature/inventory/unit-conversions/unit-conversions.types.ts';

// =============================================================================
// Unit Conversions API
// =============================================================================

export const getUnitConversions = async (params: IGetUnitConversionsParams): Promise<IPaginatedResult<IUnitConversion>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.fromUnitId) query.set('fromUnitId', params.fromUnitId);
    if (params.toUnitId) query.set('toUnitId', params.toUnitId);
    if (params.ingredientId) query.set('ingredientId', params.ingredientId);

    const response = await api.get(`/unit-conversions?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch unit conversions list', response.status, errorData);
    }
    const data: IPaginatedResult<IUnitConversion> = await response.json();
    return data;
};

export const getUnitConversionById = async (id: string): Promise<IUnitConversion> => {
    const response = await api.get(`/unit-conversions/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch unit conversion details', response.status, errorData);
    }
    return response.json();
};

export const createUnitConversion = async (payload: ICreateUnitConversionPayload): Promise<IUnitConversion> => {
    const response = await api.post('/unit-conversions', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create unit conversion', response.status, errorData);
    }
    return response.json();
};

export const updateUnitConversion = async (id: string, payload: IUpdateUnitConversionPayload): Promise<IUnitConversion> => {
    const response = await api.put(`/unit-conversions/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update unit conversion', response.status, errorData);
    }
    return response.json();
};

export const deleteUnitConversion = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/unit-conversions/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete unit conversion', response.status, errorData);
    }
    return response.json();
};

export const convertQuantity = async (params: IConvertQuantityParams): Promise<IConvertQuantityResponse> => {
    const query = new URLSearchParams();
    query.set('fromUnitId', params.fromUnitId);
    query.set('toUnitId', params.toUnitId);
    query.set('quantity', String(params.quantity));
    if (params.ingredientId) query.set('ingredientId', params.ingredientId);

    const response = await api.get(`/unit-conversions/convert?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to calculate conversion', response.status, errorData);
    }
    return response.json();
};
