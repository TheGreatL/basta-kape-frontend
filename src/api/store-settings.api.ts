import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IStoreSetting, ICreateStoreSetting, IUpdateStoreSetting } from '../feature/store-settings/store-settings.types';

export const getStoreSettings = async (): Promise<IStoreSetting> => {
    const response = await api.get('/store-settings');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch store settings', response.status, errorData);
    }
    return response.json();
};

export const createStoreSettings = async (data: ICreateStoreSetting): Promise<IStoreSetting> => {
    const response = await api.post('/store-settings', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create store settings', response.status, errorData);
    }
    return response.json();
};

export const updateStoreSettings = async (id: string, data: IUpdateStoreSetting): Promise<IStoreSetting> => {
    const response = await api.put(`/store-settings/${id}`, data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update store settings', response.status, errorData);
    }
    return response.json();
};

export const deleteStoreSettings = async (id: string): Promise<void> => {
    const response = await api.delete(`/store-settings/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete store settings', response.status, errorData);
    }
};
