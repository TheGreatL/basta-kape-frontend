import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type { IGetOrdersParams, IOrder, ICreateOrderPayload, IUpdateOrderStatusPayload } from '../feature/order/order.types';

export const getOrders = async (params: IGetOrdersParams): Promise<IPaginatedResult<IOrder>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.orderType) query.set('orderType', params.orderType);
    if (params.orderSource) query.set('orderSource', params.orderSource);

    const response = await api.get(`/orders?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch orders log list', response.status, errorData);
    }
    return response.json();
};

export const getOrderById = async (id: string): Promise<IOrder> => {
    const response = await api.get(`/orders/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to retrieve order detailed configurations', response.status, errorData);
    }
    return response.json();
};

export const createOrder = async (payload: ICreateOrderPayload): Promise<IOrder> => {
    const response = await api.post('/orders', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to place order session', response.status, errorData);
    }
    return response.json();
};

export const updateOrderStatus = async (id: string, payload: IUpdateOrderStatusPayload): Promise<IOrder> => {
    const response = await api.patch(`/orders/${id}/status`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to modify order preparation status', response.status, errorData);
    }
    return response.json();
};
