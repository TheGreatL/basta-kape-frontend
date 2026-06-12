import type { IPaginationParams } from '#/types/base.types';

export type TOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type TOrderType = 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
export type TOrderSource = 'POS' | 'MOBILE_APP' | 'WEBSITE' | 'DELIVERY_PARTNER';

export interface IGetOrdersParams extends IPaginationParams {
    search?: string;
    status?: TOrderStatus;
    orderType?: TOrderType;
    orderSource?: TOrderSource;
}

export interface IOrderItemModifier {
    id: string;
    modifierOptionId: string;
    price: number;
    modifierOption: {
        id: string;
        name: string;
    };
}

export interface IOrderItem {
    id: string;
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string | null;
    variant: {
        id: string;
        sku: string | null;
        price: number;
        product: {
            id: string;
            name: string;
            photo: string | null;
            description: string | null;
        };
        attributes?: any[] | null;
    };
    modifiers: IOrderItemModifier[];
}

export interface IOrderStatusHistory {
    id: string;
    orderId: string;
    status: TOrderStatus;
    notes: string | null;
    changedById: string;
    createdAt: string;
    changedBy?: {
        username: string;
        firstName: string;
        lastName: string;
    };
}

export interface IOrder {
    id: string;
    queueNumber: string;
    buzzerId: string | null;
    status: TOrderStatus;
    orderType: TOrderType;
    orderSource: TOrderSource;
    notes: string | null;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    netTotal: number;
    customerId: string | null;
    customerName: string | null;
    cashierSessionId: string | null;
    createdAt: string;
    updatedAt: string;
    items?: IOrderItem[];
    statusHistory?: IOrderStatusHistory[];
}

export interface ICreateOrderPayload {
    orderType?: TOrderType;
    orderSource?: TOrderSource;
    notes?: string;
    customerId?: string | null;
    customerName?: string;
    items: Array<{
        productVariantId: string;
        quantity: number;
        notes?: string;
        modifierOptionIds?: string[];
    }>;
}

export interface IUpdateOrderStatusPayload {
    status: TOrderStatus;
    notes?: string;
}
