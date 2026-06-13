import { api } from './api';
import { ApiError } from '../utils/error-handler';

export interface IPurchaseOrderItem {
    id: string;
    ingredientId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    ingredient: {
        name: string;
        defaultUnit?: {
            name: string;
            abbreviation: string;
        };
    };
}

export interface IPurchaseOrder {
    id: string;
    poNumber: string;
    status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
    notes: string | null;
    totalAmount: number;
    supplierId: string;
    supplier: {
        name: string;
    };
    createdById: string;
    createdBy: {
        firstName: string;
        lastName: string;
        username: string;
    };
    orderedAt: string | null;
    receivedAt: string | null;
    createdAt: string;
    items?: IPurchaseOrderItem[];
    _count?: {
        items: number;
    };
}

export interface IPurchaseOrdersResponse {
    data: IPurchaseOrder[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pageCount: number;
        hasMore: boolean;
    };
}

export const getPurchaseOrders = async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<IPurchaseOrdersResponse> => {
    const query = new URLSearchParams();
    query.append('page', String(params.page));
    query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.supplierId) query.append('supplierId', params.supplierId);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params.dateTo) query.append('dateTo', params.dateTo);

    const response = await api.get(`/purchase-orders?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch purchase orders', response.status, errorData);
    }
    return response.json();
};

export const getPurchaseOrderById = async (id: string): Promise<IPurchaseOrder> => {
    const response = await api.get(`/purchase-orders/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch purchase order details', response.status, errorData);
    }
    return response.json();
};

export const createPurchaseOrder = async (data: {
    supplierId: string;
    notes?: string;
    items: Array<{
        ingredientId: string;
        quantity: number;
        unitCost: number;
    }>;
}): Promise<IPurchaseOrder> => {
    const response = await api.post('/purchase-orders', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create purchase order', response.status, errorData);
    }
    return response.json();
};

export const updatePurchaseOrderStatus = async (id: string, status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'): Promise<IPurchaseOrder> => {
    const response = await api.patch(`/purchase-orders/${id}/status`, { status });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update purchase order status', response.status, errorData);
    }
    return response.json();
};
