import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IGetSuppliersListParams,
    ISupplierListItem,
    ICreateSupplierPayload,
    IUpdateSupplierPayload
} from '../feature/suppliers/suppliers.types';

export const getSuppliersList = async (params: IGetSuppliersListParams): Promise<IPaginatedResult<ISupplierListItem>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/suppliers?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch suppliers list', response.status, errorData);
    }
    return response.json();
};

export const getSupplierById = async (id: string): Promise<ISupplierListItem> => {
    const response = await api.get(`/suppliers/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch supplier details', response.status, errorData);
    }
    return response.json();
};

export const createSupplier = async (payload: ICreateSupplierPayload): Promise<ISupplierListItem> => {
    const response = await api.post('/suppliers', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create supplier profile', response.status, errorData);
    }
    return response.json();
};

export const updateSupplier = async (id: string, payload: IUpdateSupplierPayload): Promise<ISupplierListItem> => {
    const response = await api.put(`/suppliers/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update supplier details', response.status, errorData);
    }
    return response.json();
};

export const deleteSupplier = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/suppliers/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete supplier profile', response.status, errorData);
    }
    return response.json();
};

export const restoreSupplier = async (id: string): Promise<ISupplierListItem> => {
    const response = await api.patch(`/suppliers/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore supplier profile', response.status, errorData);
    }
    return response.json();
};
