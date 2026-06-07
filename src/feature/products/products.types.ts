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

// ==========================================
// 3. RECIPES (BILL OF MATERIALS)
// ==========================================
export interface IRecipeIngredient {
    id: string;
    recipeId: string;
    ingredientId: string;
    quantity: number;
    ingredientUnitId: string;
    ingredient: {
        id: string;
        name: string;
    };
    unit: {
        id: string;
        name: string;
        abbreviation: string | null;
    };
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface IRecipe {
    id: string;
    name: string;
    description: string | null;
    productVariantId: string;
    ingredients: IRecipeIngredient[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateRecipePayload {
    name: string;
    description?: string | null;
    ingredients: {
        ingredientId: string;
        quantity: number;
        ingredientUnitId: string;
    }[];
}

export interface IUpdateRecipePayload {
    name?: string;
    description?: string | null;
    ingredients?: {
        ingredientId: string;
        quantity: number;
        ingredientUnitId: string;
    }[];
}
