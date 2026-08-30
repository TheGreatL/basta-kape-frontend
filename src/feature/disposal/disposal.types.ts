import type { IPaginationParams, IPaginatedResult } from '#/types/base.types';

export type DisposalCategory = 'ALL' | 'PREPARED_FOOD' | 'RAW_INGREDIENT';

export type DisposalReason =
    | 'ALL'
    | 'EXPIRED'
    | 'SPOILED'
    | 'WASTE'
    | 'SAMPLING'
    | 'THEFT'
    | 'PROMOTIONAL_USE'
    | 'DISPOSED'
    | 'PHYSICAL_COUNT_CORRECTION'
    | 'PHYSICAL_COUNT_DISCREPANCY';

export interface IDisposedByUser {
    id: string;
    name: string;
    username?: string;
    email?: string;
}

export interface IDisposalItem {
    id: string;
    category: 'PREPARED_FOOD' | 'RAW_INGREDIENT';
    itemId: string;
    itemName: string;
    variantLabel: string | null;
    batchNumber: string | null;
    quantity: number;
    unit: string;
    estimatedCostLoss: number;
    reason: string;
    notes: string | null;
    disposedAt: string;
    disposedBy?: IDisposedByUser | null;
}

export interface ITopWastedItem {
    name: string;
    category: 'PREPARED_FOOD' | 'RAW_INGREDIENT';
    totalQuantity: number;
    unit: string;
    totalCostLoss: number;
}

export interface IDisposalSummary {
    totalFinancialLoss: number;
    preparedFoodLoss: number;
    rawIngredientLoss: number;
    totalWastedItemsCount: number;
    reasonBreakdown: Record<string, number>;
    topWastedItems: ITopWastedItem[];
}

export interface IGetDisposalsParams extends IPaginationParams {
    category?: DisposalCategory;
    reason?: DisposalReason;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export interface IGetDisposalSummaryParams {
    category?: DisposalCategory;
    reason?: DisposalReason;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export type IDisposalsResult = IPaginatedResult<IDisposalItem>;
