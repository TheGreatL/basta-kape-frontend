import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IGetProductsParams,
    IProduct,
    ICreateProductPayload,
    IUpdateProductPayload,
    IProductVariant,
    ICreateVariantPayload,
    IUpdateVariantPayload,
    IRecipe,
    ICreateRecipePayload,
    IUpdateRecipePayload
} from '../feature/products/products.types';

// ==========================================
// 1. PRODUCTS API
// ==========================================
export const getProductsList = async (params: IGetProductsParams): Promise<IPaginatedResult<IProduct>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.productCategoryId) query.set('productCategoryId', params.productCategoryId);
    if (params.productTypeId) query.set('productTypeId', params.productTypeId);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/products?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch products list', response.status, errorData);
    }
    return response.json();
};

export const getProductById = async (id: string): Promise<IProduct> => {
    const response = await api.get(`/products/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch product details', response.status, errorData);
    }
    return response.json();
};

export const createProduct = async (payload: ICreateProductPayload): Promise<IProduct> => {
    const response = await api.post('/products', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create product', response.status, errorData);
    }
    return response.json();
};

export const updateProduct = async (id: string, payload: IUpdateProductPayload): Promise<IProduct> => {
    const response = await api.put(`/products/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update product details', response.status, errorData);
    }
    return response.json();
};

export const deleteProduct = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/products/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete product', response.status, errorData);
    }
    return response.json();
};

export const restoreProduct = async (id: string): Promise<IProduct> => {
    const response = await api.patch(`/products/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore product', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 2. PRODUCT VARIANTS API
// ==========================================
export const getProductVariantById = async (id: string): Promise<IProductVariant> => {
    const response = await api.get(`/products/variants/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch variant details', response.status, errorData);
    }
    return response.json();
};

export const createProductVariant = async (productId: string, payload: ICreateVariantPayload): Promise<IProductVariant> => {
    const response = await api.post(`/products/${productId}/variants`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create product variant', response.status, errorData);
    }
    return response.json();
};

export const updateProductVariant = async (id: string, payload: IUpdateVariantPayload): Promise<IProductVariant> => {
    const response = await api.put(`/products/variants/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update product variant', response.status, errorData);
    }
    return response.json();
};

export const deleteProductVariant = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/products/variants/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete product variant', response.status, errorData);
    }
    return response.json();
};

export const restoreProductVariant = async (id: string): Promise<IProductVariant> => {
    const response = await api.patch(`/products/variants/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore product variant', response.status, errorData);
    }
    return response.json();
};

export const bulkSyncProductVariants = async (
    productId: string,
    payload: { variants: Array<{ id?: string | null; sku?: string | null; price: number; attributeValueIds: string[] }> }
): Promise<{ message: string }> => {
    const response = await api.put(`/products/${productId}/variants/bulk`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to bulk sync product variants', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 3. FILE/PHOTO UPLOAD API
// ==========================================
export const uploadProductPhoto = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload/image', formData);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to upload product photo', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 4. RECIPES API
// ==========================================
export const getVariantRecipe = async (variantId: string): Promise<IRecipe> => {
    const response = await api.get(`/products/variants/${variantId}/recipe`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch recipe details', response.status, errorData);
    }
    return response.json();
};

export const createVariantRecipe = async (variantId: string, payload: ICreateRecipePayload): Promise<IRecipe> => {
    const response = await api.post(`/products/variants/${variantId}/recipe`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create recipe', response.status, errorData);
    }
    return response.json();
};

export const updateVariantRecipe = async (variantId: string, payload: IUpdateRecipePayload): Promise<IRecipe> => {
    const response = await api.put(`/products/variants/${variantId}/recipe`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update recipe details', response.status, errorData);
    }
    return response.json();
};

export const deleteVariantRecipe = async (variantId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/products/variants/${variantId}/recipe`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete recipe', response.status, errorData);
    }
    return response.json();
};

export const restoreVariantRecipe = async (variantId: string): Promise<IRecipe> => {
    const response = await api.patch(`/products/variants/${variantId}/recipe/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore recipe', response.status, errorData);
    }
    return response.json();
};
