import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type { IGetMenuCatalogParams, IMenuProduct, IMenuCategory, IMenuProductType } from '../feature/menu/menu.types';

export const getMenuCatalog = async (params: IGetMenuCatalogParams): Promise<IPaginatedResult<IMenuProduct>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.productCategoryId) query.set('productCategoryId', params.productCategoryId);
    if (params.productTypeId) query.set('productTypeId', params.productTypeId);

    const response = await api.get(`/menu?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch menu catalog', response.status, errorData);
    }
    return response.json();
};

export const getMenuProductById = async (id: string): Promise<IMenuProduct> => {
    const response = await api.get(`/menu/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch menu product details', response.status, errorData);
    }
    return response.json();
};

export const getMenuCategories = async (): Promise<IMenuCategory[]> => {
    const response = await api.get('/menu/categories');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch menu categories', response.status, errorData);
    }
    const data: IMenuCategory[] = (await response.json()) || [];
    return data;
};

export const getMenuTypes = async (): Promise<IMenuProductType[]> => {
    const response = await api.get('/menu/types');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch menu product types', response.status, errorData);
    }
    const data: IMenuProductType[] = (await response.json()) || [];
    return data;
};
