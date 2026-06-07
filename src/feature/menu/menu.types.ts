import type { IPaginationParams } from '#/types/base.types';

export interface IGetMenuCatalogParams extends IPaginationParams {
    search?: string;
    productCategoryId?: string;
    productTypeId?: string;
}

export interface IMenuCategory {
    id: string;
    name: string;
    description: string | null;
}

export interface IMenuProductType {
    id: string;
    name: string;
    description: string | null;
}

export interface IMenuProduct {
    id: string;
    name: string;
    photo: string | null;
    description: string | null;
    productCategoryId: string | null;
    productTypeId: string | null;
    category: IMenuCategory | null;
    type: IMenuProductType | null;
    variants: IMenuProductVariant[];
}

export interface IMenuProductVariant {
    id: string;
    productId: string;
    sku: string | null;
    price: number;
    attributes: IMenuVariantAttribute[];
    recipe: IMenuRecipe | null;
    maxProduceable?: number | null;
}

export interface IMenuVariantAttribute {
    id: string;
    productAttributeValueId: string;
    attributeValue: {
        id: string;
        productAttributeId: string;
        value: string;
        attribute: {
            id: string;
            name: string;
        };
    };
}

export interface IMenuRecipe {
    id: string;
    name: string;
    description: string | null;
    ingredients: IMenuRecipeIngredient[];
}

export interface IMenuRecipeIngredient {
    id: string;
    ingredientId: string;
    quantity: number;
    ingredient: {
        id: string;
        name: string;
    };
    unit: {
        id: string;
        name: string;
        abbreviation: string;
    };
}
