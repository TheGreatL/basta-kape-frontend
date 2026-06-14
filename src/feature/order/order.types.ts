import * as z from 'zod';
import { Clock, Coins, Wallet, Landmark } from 'lucide-react';
import type { IPaginationParams } from '#/types/base.types';
import type { IOrderDiscount } from '../store-settings/discounts.types';

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
    discounts?: IOrderDiscount[];
    voidLogs?: IVoidLog[];
    payments?: IOrderPayment[];
}

export interface ICreateOrderPayload {
    orderType?: TOrderType;
    orderSource?: TOrderSource;
    notes?: string;
    customerId?: string | null;
    customerName?: string;
    paymentMethod?: 'CASH' | 'GCASH' | 'PAYMAYA' | null;
    gcashReferenceNumber?: string | null;
    paymentProofPhoto?: string | null;
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

export type TPaymentMethod = 'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD';
export type TPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IOrderPayment {
    id: string;
    orderId: string;
    paymentMethod: TPaymentMethod;
    paymentStatus: TPaymentStatus;
    amount: number;
    gcashReferenceNumber?: string | null;
    paymentProofPhoto?: string | null;
    amountTendered?: number | null;
    amountChange?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ICreatePaymentPayload {
    paymentMethod: TPaymentMethod;
    amountTendered?: number;
    gcashReferenceNumber?: string;
    paymentProofPhoto?: string;
}

export interface IVoidLog {
    id: string;
    orderId: string;
    reason: string;
    voidedById: string;
    createdAt: string;
    voidedBy: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
    };
    order: {
        id: string;
        queueNumber: string;
        customerName: string | null;
        netTotal: number;
    };
}

export const orderCreateFormSchema = z
    .object({
        customerType: z.enum(['GUEST', 'MEMBER']),
        guestName: z.string().optional(),
        customerId: z.string().nullable().optional(),
        orderType: z.enum(['DINE_IN', 'TAKE_OUT', 'DELIVERY']),
        notes: z.string().optional(),
        items: z
            .array(
                z.object({
                    productVariantId: z.string(),
                    name: z.string(),
                    sku: z.string().nullable(),
                    price: z.number(),
                    quantity: z.number(),
                    notes: z.string().optional(),
                    modifierOptionIds: z.array(z.string()).optional(),
                    modifierNames: z.array(z.string()).optional()
                })
            )
            .min(1, 'Please add at least one item to the order')
    })
    .superRefine((data, ctx) => {
        if (data.customerType === 'GUEST' && (!data.guestName || !data.guestName.trim())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['guestName'],
                message: 'Guest name is required for guest checkouts'
            });
        }
        if (data.customerType === 'MEMBER' && !data.customerId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['customerId'],
                message: 'Please select a registered member profile'
            });
        }
    });

export const orderDiscountFormSchema = z.object({
    discountId: z.string().min(1, 'Please select a discount'),
    referenceId: z.string().optional(),
    referenceName: z.string().optional()
});

export const createOrderPaymentSchema = (netTotal: number) => {
    return z
        .object({
            paymentMethod: z.enum(['UNPAID', 'CASH', 'GCASH', 'PAYMAYA', 'CREDIT_CARD']),
            amountTendered: z.number().optional(),
            referenceNumber: z.string().optional(),
            receiptFile: z.any().nullable().optional()
        })
        .superRefine((data, ctx) => {
            if (data.paymentMethod === 'CASH') {
                if (data.amountTendered === undefined || data.amountTendered < netTotal) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['amountTendered'],
                        message: `Amount tendered must be at least the net total of ₱${netTotal.toFixed(2)}`
                    });
                }
            }
            if (data.paymentMethod === 'GCASH' || data.paymentMethod === 'PAYMAYA') {
                if (!data.referenceNumber || !data.referenceNumber.trim() || data.referenceNumber.trim().length < 5) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['referenceNumber'],
                        message: 'Digital payments require a reference number of at least 5 characters.'
                    });
                }
            }
        });
};

export const PAYMENT_METHODS = [
    { id: 'UNPAID', label: 'Unpaid / Delay', icon: Clock },
    { id: 'CASH', label: 'Cash Drawer', icon: Coins },
    { id: 'GCASH', label: 'GCash', icon: Wallet },
    { id: 'PAYMAYA', label: 'Maya Wallet', icon: Wallet },
    { id: 'CREDIT_CARD', label: 'Card Swipe', icon: Landmark }
] as const;
