import type { IPaginationParams } from '#/types/base.types';

export interface IGetProductSettingsListParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
}

// 1. Categories
export interface ICategory {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateCategoryPayload {
    name: string;
    description?: string | null;
}

export interface IUpdateCategoryPayload {
    name?: string;
    description?: string | null;
}

export interface CategoryTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
}

// 2. Product Types
export interface IProductType {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateProductTypePayload {
    name: string;
    description?: string | null;
}

export interface IUpdateProductTypePayload {
    name?: string;
    description?: string | null;
}

export interface ProductTypeTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
}

// 3. Attributes
export interface IAttribute {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateAttributePayload {
    name: string;
    description?: string | null;
}

export interface IUpdateAttributePayload {
    name?: string;
    description?: string | null;
}

export interface AttributeTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
}

// 4. Attribute Values
export interface IAttributeValue {
    id: string;
    productAttributeId: string;
    value: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateAttributeValuePayload {
    productAttributeId: string;
    value: string;
}

export interface IUpdateAttributeValuePayload {
    value: string;
}
