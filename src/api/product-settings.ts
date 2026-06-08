import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IGetProductSettingsListParams,
    ICategory,
    ICreateCategoryPayload,
    IUpdateCategoryPayload,
    IProductType,
    ICreateProductTypePayload,
    IUpdateProductTypePayload,
    IAttribute,
    ICreateAttributePayload,
    IUpdateAttributePayload,
    IAttributeValue,
    ICreateAttributeValuePayload,
    IUpdateAttributeValuePayload
} from '../feature/product-settings/product-settings-types';

// ==========================================
// 1. PRODUCT CATEGORIES API
// ==========================================
export const getCategoriesList = async (params: IGetProductSettingsListParams): Promise<IPaginatedResult<ICategory>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/product-settings/categories?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch categories list', response.status, errorData);
    }
    return response.json();
};

export const getCategoryById = async (id: string): Promise<ICategory> => {
    const response = await api.get(`/product-settings/categories/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch category details', response.status, errorData);
    }
    return response.json();
};

export const createCategory = async (payload: ICreateCategoryPayload): Promise<ICategory> => {
    const response = await api.post('/product-settings/categories', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create category', response.status, errorData);
    }
    return response.json();
};

export const updateCategory = async (id: string, payload: IUpdateCategoryPayload): Promise<ICategory> => {
    const response = await api.put(`/product-settings/categories/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update category', response.status, errorData);
    }
    return response.json();
};

export const deleteCategory = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/product-settings/categories/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete category', response.status, errorData);
    }
    return response.json();
};

export const restoreCategory = async (id: string): Promise<ICategory> => {
    const response = await api.patch(`/product-settings/categories/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore category', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 2. PRODUCT TYPES API
// ==========================================
export const getProductTypesList = async (params: IGetProductSettingsListParams): Promise<IPaginatedResult<IProductType>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/product-settings/types?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch product types list', response.status, errorData);
    }
    return response.json();
};

export const getProductTypeById = async (id: string): Promise<IProductType> => {
    const response = await api.get(`/product-settings/types/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch product type details', response.status, errorData);
    }
    return response.json();
};

export const createProductType = async (payload: ICreateProductTypePayload): Promise<IProductType> => {
    const response = await api.post('/product-settings/types', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create product type', response.status, errorData);
    }
    return response.json();
};

export const updateProductType = async (id: string, payload: IUpdateProductTypePayload): Promise<IProductType> => {
    const response = await api.put(`/product-settings/types/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update product type', response.status, errorData);
    }
    return response.json();
};

export const deleteProductType = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/product-settings/types/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete product type', response.status, errorData);
    }
    return response.json();
};

export const restoreProductType = async (id: string): Promise<IProductType> => {
    const response = await api.patch(`/product-settings/types/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore product type', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 3. PRODUCT ATTRIBUTES API
// ==========================================
export const getAttributesList = async (params: IGetProductSettingsListParams): Promise<IPaginatedResult<IAttribute>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/product-settings/attributes?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch attributes list', response.status, errorData);
    }
    return response.json();
};

export const getAttributeById = async (id: string): Promise<IAttribute> => {
    const response = await api.get(`/product-settings/attributes/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch attribute details', response.status, errorData);
    }
    return response.json();
};

export const createAttribute = async (payload: ICreateAttributePayload): Promise<IAttribute> => {
    const response = await api.post('/product-settings/attributes', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create attribute', response.status, errorData);
    }
    return response.json();
};

export const updateAttribute = async (id: string, payload: IUpdateAttributePayload): Promise<IAttribute> => {
    const response = await api.put(`/product-settings/attributes/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update attribute', response.status, errorData);
    }
    return response.json();
};

export const deleteAttribute = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/product-settings/attributes/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete attribute', response.status, errorData);
    }
    return response.json();
};

export const restoreAttribute = async (id: string): Promise<IAttribute> => {
    const response = await api.patch(`/product-settings/attributes/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore attribute', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 4. PRODUCT ATTRIBUTE VALUES API
// ==========================================
export const getAttributeValuesList = async (attributeId: string): Promise<IPaginatedResult<IAttributeValue>> => {
    const response = await api.get(`/product-settings/attributes/${attributeId}/values?limit=100`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch attribute values list', response.status, errorData);
    }
    return response.json();
};

export const createAttributeValue = async (payload: ICreateAttributeValuePayload): Promise<IAttributeValue> => {
    const response = await api.post('/product-settings/attribute-values', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create attribute value', response.status, errorData);
    }
    return response.json();
};

export const updateAttributeValue = async (id: string, payload: IUpdateAttributeValuePayload): Promise<IAttributeValue> => {
    const response = await api.put(`/product-settings/attribute-values/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update attribute value', response.status, errorData);
    }
    return response.json();
};

export const getAttributeValueById = async (id: string): Promise<IAttributeValue> => {
    const response = await api.get(`/product-settings/attribute-values/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch attribute value details', response.status, errorData);
    }
    return response.json();
};

export const deleteAttributeValue = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/product-settings/attribute-values/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete attribute value', response.status, errorData);
    }
    return response.json();
};

export const restoreAttributeValue = async (id: string): Promise<IAttributeValue> => {
    const response = await api.patch(`/product-settings/attribute-values/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore attribute value', response.status, errorData);
    }
    return response.json();
};
