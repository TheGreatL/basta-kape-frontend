import type { IPaginationParams, IPaginatedResult } from '#/types/base.types';

export type PreparationType = 'MADE_TO_ORDER' | 'PREPARED_DISPLAY';

export type PreparedBatchStatus = 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DEPLETED' | 'DISPOSED';

export type PreparedAdjustmentType = 'SALE' | 'EXPIRED' | 'SPOILED' | 'WASTE' | 'SAMPLING' | 'DISPOSED' | 'CORRECTION';

export interface IDisplayStockItemSummary {
    productVariantId: string;
    productId: string;
    productName: string;
    sku: string | null;
    price: number;
    variantLabel: string;
    photo?: string | null;
    totalFreshQuantity: number;
    totalNearExpiryQuantity: number;
    totalExpiredQuantity: number;
    earliestExpiry: string | null;
    activeBatchesCount: number;
}

export interface IDisplayStockSummaryResponse {
    totalFreshUnits: number;
    totalExpiringSoonUnits: number;
    totalExpiredUnits: number;
    items: IDisplayStockItemSummary[];
}

export interface ICreatePreparedBatchRequest {
    productVariantId: string;
    quantity: number;
    shelfLifeMinutes?: number;
    notes?: string | null;
}

export interface IDisposePreparedBatchRequest {
    quantity: number;
    reason: PreparedAdjustmentType;
    notes?: string | null;
}

export interface IPreparedItemBatch {
    id: string;
    batchNumber: string;
    productVariantId: string;
    productId?: string;
    quantityPrepared: number;
    currentQuantity: number;
    preparedAt: string;
    shelfLifeMinutes: number;
    expiresAt: string;
    status: PreparedBatchStatus;
    notes: string | null;
    product?: {
        id: string;
        name: string;
        photo: string | null;
    };
    variant?: {
        id: string;
        sku: string | null;
        price: number;
    };
}

export interface IGetPreparedBatchesParams extends IPaginationParams {
    status?: PreparedBatchStatus | '';
    productVariantId?: string;
    expiringWithinMinutes?: number;
    search?: string;
}

export type IPreparedBatchesResult = IPaginatedResult<IPreparedItemBatch>;
