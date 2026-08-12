import type { IPaginationParams, IUserAudit } from '#/types/base.types';

export type TItemType = 'INGREDIENT' | 'PACKAGING_MATERIAL' | 'SUPPLY';
export type TUnitCategory = 'ALL' | 'INGREDIENT' | 'PACKAGING_MATERIAL' | 'SUPPLY';

// =============================================================================
// Measurement Units Configuration
// =============================================================================
export interface IIngredientUnit {
    id: string;
    name: string;
    abbreviation: string;
    category: TUnitCategory;
    status: 'active' | 'archive';
    createdAt: string;
    updatedAt: string;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetIngredientUnitsParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
    category?: TUnitCategory;
}

export interface ICreateIngredientUnitPayload {
    name: string;
    abbreviation?: string;
    category?: TUnitCategory;
}

export interface IUpdateIngredientUnitPayload {
    name?: string;
    abbreviation?: string;
    category?: TUnitCategory;
}

// =============================================================================
// Raw Ingredients Configurations
// =============================================================================
export interface IIngredient {
    id: string;
    name: string;
    type: TItemType;
    ingredientUnitId: string;
    reorderPoint: number;
    description: string | null;
    status: 'active' | 'archive';
    createdAt: string;
    updatedAt: string;
    defaultUnit?: IIngredientUnit;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetIngredientsParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
    type?: TItemType | '';
}

export interface ICreateIngredientPayload {
    name: string;
    type?: TItemType;
    ingredientUnitId: string;
    reorderPoint?: number;
    description?: string;
}

export interface IUpdateIngredientPayload {
    name?: string;
    type?: TItemType;
    ingredientUnitId?: string;
    reorderPoint?: number;
    description?: string;
}

// =============================================================================
// Live Stock Levels & Overwrites
// =============================================================================
export type TInventoryStatus = 'SAFE' | 'CRITICAL' | 'OUT_OF_STOCK';

export interface IIngredientInventory {
    id: string;
    ingredientId: string;
    currentQuantity: number;
    status: TInventoryStatus;
    lastPhysicalCount: string | null;
    createdAt: string;
    updatedAt: string;
    ingredient: IIngredient & {
        defaultUnit: IIngredientUnit;
    };
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetInventoryLevelsParams extends IPaginationParams {
    search?: string;
    status?: TInventoryStatus | '';
    type?: TItemType | '';
    recordStatus?: 'active' | 'archive';
}

// =============================================================================
// Supplier Deliveries Log
// =============================================================================
export interface IDelivery {
    id: string;
    ingredientId: string;
    supplierId: string | null;
    quantityReceived: number;
    currentQuantity: number;
    unitCost: number;
    totalCost: number;
    batchNumber: string | null;
    expiryDate: string | null;
    receivedAt: string;
    ingredient?: IIngredient;
    supplier?: {
        id: string;
        name: string;
    } | null;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetDeliveriesParams extends IPaginationParams {
    search?: string;
}

export interface ICreateDeliveryPayload {
    ingredientId: string;
    supplierId?: string | null;
    quantityReceived: number;
    unitCost: number;
    batchNumber?: string;
    expiryDate?: string | null;
}

// =============================================================================
// Waste & Adjustments Log
// =============================================================================
export type TAdjustmentType = 'WASTE' | 'SPOILED' | 'EXPIRED' | 'THEFT' | 'PROMOTIONAL_USE' | 'PHYSICAL_COUNT_DISCREPANCY';

export interface IAdjustment {
    id: string;
    ingredientId: string;
    quantity: number;
    type: TAdjustmentType;
    reason: string | null;
    createdAt: string;
    ingredient?: IIngredient;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetAdjustmentsParams extends IPaginationParams {
    search?: string;
}

export interface ICreateAdjustmentPayload {
    ingredientId: string;
    quantity: number;
    type: TAdjustmentType;
    reason?: string;
}

// =============================================================================
// Production Projections & Forecasting
// =============================================================================
export interface IForecastIngredient {
    ingredientId: string;
    name: string;
    currentQuantity: number;
    requiredQuantity: number;
    unit: string;
    canProduce: number;
}

export interface IForecast {
    variantId: string;
    productId: string;
    name: string;
    sku: string | null;
    price: number;
    hasRecipe: boolean;
    maxProduceable: number | 'Unlimited';
    bottleneck: {
        ingredientId: string;
        name: string;
        currentQuantity: number;
        requiredQuantity: number;
        unit: string;
    } | null;
    ingredients: IForecastIngredient[];
}

// =============================================================================
// Inventory Dashboard Widgets
// =============================================================================
export interface IInventoryDashboardOverview {
    totalIngredients: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export interface IDashboardDelivery {
    id: string;
    ingredientName: string;
    supplierName: string | null;
    quantityReceived: number;
    currentQuantity: number;
    unitAbbreviation: string | null;
    totalCost: number;
    receivedAt: string;
}

export interface IDashboardAdjustment {
    id: string;
    ingredientName: string;
    quantity: number;
    unitAbbreviation: string | null;
    type: TAdjustmentType;
    reason: string | null;
    createdAt: string;
}

export interface IDashboardExpiringSoon {
    id: string;
    batchNumber: string | null;
    expiryDate: string;
    quantityReceived: number;
    currentQuantity: number;
    ingredientName: string;
    unitAbbreviation: string | null;
}

export interface IDashboardWasteSummary {
    type: TAdjustmentType;
    count: number;
    totalQuantity: number;
}
