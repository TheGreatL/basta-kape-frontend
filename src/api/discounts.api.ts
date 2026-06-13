import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type {
    IDiscount,
    ICreateDiscountPayload,
    IUpdateDiscountPayload,
    IOrderDiscount,
    IApplyOrderDiscountPayload
} from '../feature/store-settings/discounts.types';

export const getDiscountsConfig = async (): Promise<IDiscount[]> => {
    const response = await api.get('/discounts');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch discount configurations list', response.status, errorData);
    }
    return response.json();
};

export const createDiscountConfig = async (payload: ICreateDiscountPayload): Promise<IDiscount> => {
    const response = await api.post('/discounts', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create discount configuration', response.status, errorData);
    }
    return response.json();
};

export const updateDiscountConfig = async (id: string, payload: IUpdateDiscountPayload): Promise<IDiscount> => {
    const response = await api.put(`/discounts/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update discount configuration', response.status, errorData);
    }
    return response.json();
};

export const deleteDiscountConfig = async (id: string): Promise<IDiscount> => {
    const response = await api.delete(`/discounts/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete discount configuration', response.status, errorData);
    }
    return response.json();
};

export const applyDiscountToOrder = async (orderId: string, payload: IApplyOrderDiscountPayload): Promise<IOrderDiscount> => {
    const response = await api.post(`/orders/${orderId}/discounts`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to apply discount to order', response.status, errorData);
    }
    return response.json();
};

export const removeDiscountFromOrder = async (orderId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/orders/${orderId}/discounts`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to remove discount from order', response.status, errorData);
    }
    return response.json();
};
