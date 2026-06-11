import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    ICreateCustomer,
    IUpdateCustomer,
    IGetCustomerListQuery,
    ICustomerResponse,
    IAddCartItem,
    IUpdateCartItem,
    ICartItemResponse,
    ICartResponse
} from '../feature/customer/customer.types';

// ==========================================
// CUSTOMER PROFILE ENDPOINTS
// ==========================================

export const getCustomers = async (params: IGetCustomerListQuery): Promise<IPaginatedResult<ICustomerResponse>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/customers?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch customers', response.status, errorData);
    }
    return response.json();
};

export const getCustomerById = async (id: string): Promise<ICustomerResponse> => {
    const response = await api.get(`/customers/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch customer profile', response.status, errorData);
    }
    return response.json();
};

export const createCustomer = async (payload: ICreateCustomer): Promise<ICustomerResponse> => {
    const response = await api.post('/customers', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create customer profile', response.status, errorData);
    }
    return response.json();
};

export const updateCustomer = async (id: string, payload: IUpdateCustomer): Promise<ICustomerResponse> => {
    const response = await api.put(`/customers/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update customer profile', response.status, errorData);
    }
    return response.json();
};

export const deleteCustomer = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete customer profile', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// CART OPERATIONS ENDPOINTS
// ==========================================

export const getCart = async (customerId: string): Promise<ICartResponse> => {
    const response = await api.get(`/customers/${customerId}/cart`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch shopping cart', response.status, errorData);
    }
    return response.json();
};

export const addCartItem = async (customerId: string, payload: IAddCartItem): Promise<ICartItemResponse> => {
    const response = await api.post(`/customers/${customerId}/cart`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to add item to cart', response.status, errorData);
    }
    return response.json();
};

export const updateCartItem = async (customerId: string, cartItemId: string, payload: IUpdateCartItem): Promise<ICartItemResponse> => {
    const response = await api.put(`/customers/${customerId}/cart/${cartItemId}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update cart item quantity', response.status, errorData);
    }
    return response.json();
};

export const removeCartItem = async (customerId: string, cartItemId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${customerId}/cart/${cartItemId}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to remove item from cart', response.status, errorData);
    }
    return response.json();
};

export const clearCart = async (customerId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${customerId}/cart`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to clear cart', response.status, errorData);
    }
    return response.json();
};

// Helper: resolve current user profile
export const getMyCustomerProfile = async (username: string): Promise<ICustomerResponse> => {
    const response = await getCustomers({ search: username, limit: 10 });
    const found = response.data.find((c) => c.user.username.toLowerCase() === username.toLowerCase());
    if (!found) {
        // If not found, let's try creating a placeholder customer profile if possible
        // but normally it should exist or be created by register/admin
        throw new ApiError('Customer profile not found', 404, null);
    }
    return found;
};

export const restoreCustomer = async (id: string): Promise<ICustomerResponse> => {
    const response = await api.patch(`/customers/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore customer profile', response.status, errorData);
    }
    return response.json();
};

export const getCustomerOrders = async (
    customerId: string,
    params: { page?: number; limit?: number; search?: string; status?: string }
): Promise<IPaginatedResult<any>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/customers/${customerId}/orders?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch customer order history', response.status, errorData);
    }
    return response.json();
};
