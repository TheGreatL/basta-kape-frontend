import { api } from './api';
import { ApiError } from '../utils/error-handler';

export interface ITransaction {
    id: string;
    orderId: string;
    paymentMethod: 'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    amount: number;
    gcashReferenceNumber: string | null;
    paymentProofPhoto: string | null;
    amountTendered: number | null;
    amountChange: number | null;
    createdAt: string;
    updatedAt: string;
    order: {
        id: string;
        queueNumber: string | null;
        customerName: string | null;
        netTotal: number;
        status: string;
        orderType: string;
        orderSource: string;
        cashierSessionId: string | null;
    };
}

export interface ITransactionsResponse {
    data: ITransaction[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pageCount: number;
        hasMore: boolean;
    };
}

export const getTransactions = async (params: {
    page: number;
    limit: number;
    search?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<ITransactionsResponse> => {
    const query = new URLSearchParams();
    query.append('page', String(params.page));
    query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params.dateTo) query.append('dateTo', params.dateTo);

    const response = await api.get(`/orders/payments?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch transactions', response.status, errorData);
    }
    return response.json();
};

export const updateTransactionReceipt = async (
    paymentId: string,
    data: {
        paymentProofPhoto?: string;
        gcashReferenceNumber?: string;
    }
): Promise<ITransaction> => {
    const response = await api.patch(`/orders/payments/${paymentId}/receipt`, data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update receipt details', response.status, errorData);
    }
    return response.json();
};

export const uploadImageFile = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/image', formData);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to upload image file', response.status, errorData);
    }
    return response.json();
};
