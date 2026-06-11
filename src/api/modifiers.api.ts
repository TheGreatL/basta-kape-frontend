import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IGetModifierGroupsParams,
    IModifierGroup,
    ICreateModifierGroupPayload,
    IUpdateModifierGroupPayload,
    IModifierOption,
    ICreateModifierOptionPayload,
    IUpdateModifierOptionPayload,
    IModifierRecipe,
    ICreateModifierRecipePayload,
    IUpdateModifierRecipePayload
} from '../feature/modifier/modifier.types';

// ==========================================
// 1. MODIFIER GROUPS API
// ==========================================
export const getModifierGroups = async (params: IGetModifierGroupsParams): Promise<IPaginatedResult<IModifierGroup>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.productId) query.set('productId', params.productId);

    const response = await api.get(`/modifiers/groups?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch modifier groups', response.status, errorData);
    }
    return response.json();
};

export const getModifierGroupById = async (id: string): Promise<IModifierGroup> => {
    const response = await api.get(`/modifiers/groups/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch modifier group details', response.status, errorData);
    }
    return response.json();
};

export const createModifierGroup = async (payload: ICreateModifierGroupPayload): Promise<IModifierGroup> => {
    const response = await api.post('/modifiers/groups', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create modifier group', response.status, errorData);
    }
    return response.json();
};

export const updateModifierGroup = async (id: string, payload: IUpdateModifierGroupPayload): Promise<IModifierGroup> => {
    const response = await api.put(`/modifiers/groups/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update modifier group', response.status, errorData);
    }
    return response.json();
};

export const deleteModifierGroup = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/modifiers/groups/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete modifier group', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 2. MODIFIER OPTIONS API
// ==========================================
export const createModifierOption = async (groupId: string, payload: ICreateModifierOptionPayload): Promise<IModifierOption> => {
    const response = await api.post(`/modifiers/groups/${groupId}/options`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create modifier option', response.status, errorData);
    }
    return response.json();
};

export const updateModifierOption = async (id: string, payload: IUpdateModifierOptionPayload): Promise<IModifierOption> => {
    const response = await api.put(`/modifiers/options/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update modifier option', response.status, errorData);
    }
    return response.json();
};

export const deleteModifierOption = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/modifiers/options/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete modifier option', response.status, errorData);
    }
    return response.json();
};

// ==========================================
// 3. MODIFIER RECIPE API
// ==========================================
export const getModifierOptionRecipe = async (optionId: string): Promise<IModifierRecipe> => {
    const response = await api.get(`/modifiers/options/${optionId}/recipe`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch modifier option recipe details', response.status, errorData);
    }
    return response.json();
};

export const createModifierOptionRecipe = async (optionId: string, payload: ICreateModifierRecipePayload): Promise<IModifierRecipe> => {
    const response = await api.post(`/modifiers/options/${optionId}/recipe`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create modifier option recipe', response.status, errorData);
    }
    return response.json();
};

export const updateModifierOptionRecipe = async (optionId: string, payload: IUpdateModifierRecipePayload): Promise<IModifierRecipe> => {
    const response = await api.put(`/modifiers/options/${optionId}/recipe`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update modifier option recipe details', response.status, errorData);
    }
    return response.json();
};

export const deleteModifierOptionRecipe = async (optionId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/modifiers/options/${optionId}/recipe`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete modifier option recipe', response.status, errorData);
    }
    return response.json();
};

export const restoreModifierOptionRecipe = async (optionId: string): Promise<IModifierRecipe> => {
    const response = await api.patch(`/modifiers/options/${optionId}/recipe/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore modifier option recipe', response.status, errorData);
    }
    return response.json();
};
