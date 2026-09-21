import type { IPaginationParams, IUserAudit } from '#/types/base.types';

export interface IUnitConversionItemUnit {
    id: string;
    name: string;
    abbreviation: string | null;
}

export interface IUnitConversionItemIngredient {
    id: string;
    name: string;
}

export interface IUnitConversion {
    id: string;
    fromUnitId: string;
    fromUnit: IUnitConversionItemUnit;
    toUnitId: string;
    toUnit: IUnitConversionItemUnit;
    factor: number;
    ingredientId?: string | null;
    ingredient?: IUnitConversionItemIngredient | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface IGetUnitConversionsParams extends IPaginationParams {
    search?: string;
    fromUnitId?: string;
    toUnitId?: string;
    ingredientId?: string;
}

export interface ICreateUnitConversionPayload {
    fromUnitId: string;
    toUnitId: string;
    factor: number;
    ingredientId?: string | null;
}

export interface IUpdateUnitConversionPayload {
    factor: number;
}

export interface IConvertQuantityParams {
    fromUnitId: string;
    toUnitId: string;
    quantity: number;
    ingredientId?: string;
}

export interface IConvertQuantityResponse {
    fromUnitId: string;
    fromUnitName: string;
    toUnitId: string;
    toUnitName: string;
    originalQuantity: number;
    convertedQuantity: number;
    factor: number;
    ingredientId?: string | null;
    ingredientName?: string | null;
}
