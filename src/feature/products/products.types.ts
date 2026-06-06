import type { IPaginationParams } from '#/types/base.types';

export interface IGetProductsParams extends IPaginationParams {
    search?: string;
    productCategoryId?: string;
    productTypeId?: string;
    status?: 'active' | 'archive';
}

export interface IProduct {
    id: string;
    name: string;
    photo: string | null;
    description: string | null;
    productCategoryId: string | null;
    productTypeId: string | null;
    category: {
        id: string;
        name: string;
    } | null;
    type: {
        id: string;
        name: string;
    } | null;
    variants: IProductVariant[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface IProductVariant {
    id: string;
    productId: string;
    sku: string | null;
    price: number;
    attributes: IVariantAttribute[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface IVariantAttribute {
    id: string;
    productVariantId: string;
    productAttributeValueId: string;
    attributeValue: IVariantAttributeValue;
}

export interface IVariantAttributeValue {
    id: string;
    productAttributeId: string;
    value: string;
    attribute: {
        id: string;
        name: string;
    };
}

export interface ICreateProductPayload {
    name: string;
    photo?: string | null;
    description?: string | null;
    productCategoryId?: string | null;
    productTypeId?: string | null;
}

export interface IUpdateProductPayload {
    name?: string;
    photo?: string | null;
    description?: string | null;
    productCategoryId?: string | null;
    productTypeId?: string | null;
}

export interface ICreateVariantPayload {
    sku?: string | null;
    price: number;
    attributeValueIds?: string[];
}

export interface IUpdateVariantPayload {
    sku?: string | null;
    price?: number;
    attributeValueIds?: string[];
}
