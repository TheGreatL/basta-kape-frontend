export type TDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface IDiscount {
    id: string;
    name: string;
    type: TDiscountType;
    value: number;
    code: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateDiscountPayload {
    name: string;
    type?: TDiscountType;
    value: number;
    code?: string | null;
    isActive?: boolean;
}

export interface IUpdateDiscountPayload {
    name?: string;
    type?: TDiscountType;
    value?: number;
    code?: string | null;
    isActive?: boolean;
}

export interface IOrderDiscount {
    id: string;
    orderId: string;
    discountId: string;
    amount: number;
    referenceId: string | null;
    referenceName: string | null;
    createdAt: string;
    discount?: {
        id: string;
        name: string;
        type: TDiscountType;
        value: number;
    };
}

export interface IApplyOrderDiscountPayload {
    discountId: string;
    referenceId?: string | null;
    referenceName?: string | null;
}
