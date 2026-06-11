import type { IPaginationParams, IUserAudit } from '#/types/base.types';

export interface IGetModifierGroupsParams extends IPaginationParams {
    search?: string;
    productId?: string;
}

export interface IModifierOption {
    id: string;
    modifierGroupId: string;
    name: string;
    price: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface IModifierGroup {
    id: string;
    name: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    options: IModifierOption[];
    products: {
        id: string;
        name: string;
    }[];
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface ICreateModifierGroupPayload {
    name: string;
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    productIds?: string[];
}

export interface IUpdateModifierGroupPayload {
    name?: string;
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    productIds?: string[];
}

export interface ICreateModifierOptionPayload {
    name: string;
    price?: number;
}

export interface IUpdateModifierOptionPayload {
    name?: string;
    price?: number;
}

export interface IModifierRecipeIngredient {
    id: string;
    recipeId: string;
    ingredientId: string;
    quantity: number;
    ingredientUnitId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    ingredient: {
        id: string;
        name: string;
    };
    unit: {
        id: string;
        name: string;
        abbreviation: string | null;
    };
}

export interface IModifierRecipe {
    id: string;
    name: string;
    description: string | null;
    modifierOptionId: string;
    productVariantId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    ingredients: IModifierRecipeIngredient[];
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface ICreateModifierRecipePayload {
    name: string;
    description?: string | null;
    ingredients: {
        ingredientId: string;
        quantity: number;
        ingredientUnitId: string;
    }[];
}

export interface IUpdateModifierRecipePayload {
    name?: string;
    description?: string | null;
    ingredients?: {
        ingredientId: string;
        quantity: number;
        ingredientUnitId: string;
    }[];
}
