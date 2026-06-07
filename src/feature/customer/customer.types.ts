import type { IPaginationParams } from '#/types/base.types';

// ==========================================
// CUSTOMER TYPES
// ==========================================

export interface ICreateCustomer {
    email: string;
    username: string;
    password?: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phoneNumber?: string | null;
}

export interface IUpdateCustomer {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    phoneNumber?: string | null;
}

export interface IGetCustomerListQuery extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
}

export interface ICustomerUser {
    id: string;
    email: string;
    username: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phoneNumber: string | null;
    profilePhoto: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICustomerResponse {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    user: ICustomerUser;
}

// ==========================================
// CUSTOMER CART TYPES
// ==========================================

export interface IAddCartItem {
    productVariantId: string;
    quantity: number;
}

export interface IUpdateCartItem {
    quantity: number;
}

export interface IProductCategoryInfo {
    id: string;
    name: string;
}

export interface IProductTypeInfo {
    id: string;
    name: string;
}

export interface IProductInfo {
    id: string;
    name: string;
    photo: string | null;
    description: string | null;
    category?: IProductCategoryInfo | null;
    type?: IProductTypeInfo | null;
}

export interface IAttributeInfo {
    id: string;
    name: string;
}

export interface IAttributeValueInfo {
    id: string;
    value: string;
    attribute: IAttributeInfo;
}

export interface IProductVariantAttributeInfo {
    id: string;
    attributeValue: IAttributeValueInfo;
}

export interface IProductVariantInfo {
    id: string;
    sku: string | null;
    price: number;
    product: IProductInfo;
    attributes: IProductVariantAttributeInfo[];
}

export interface ICartItemResponse {
    id: string;
    customerId: string;
    quantity: number;
    unitPrice: number;
    productVariantId: string;
    productVariant: IProductVariantInfo;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICartResponse {
    items: ICartItemResponse[];
    totalAmount: number;
}
