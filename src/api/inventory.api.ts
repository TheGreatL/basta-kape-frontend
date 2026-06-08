import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IIngredientUnit,
    IGetIngredientUnitsParams,
    ICreateIngredientUnitPayload,
    IUpdateIngredientUnitPayload,
    IIngredient,
    IGetIngredientsParams,
    ICreateIngredientPayload,
    IUpdateIngredientPayload,
    IIngredientInventory,
    IGetInventoryLevelsParams,
    IDelivery,
    IGetDeliveriesParams,
    ICreateDeliveryPayload,
    IAdjustment,
    IGetAdjustmentsParams,
    ICreateAdjustmentPayload,
    IForecast
} from '../feature/inventory/inventory.types';

// =============================================================================
// Ingredient Units API
// =============================================================================
export const getIngredientUnits = async (params: IGetIngredientUnitsParams): Promise<IPaginatedResult<IIngredientUnit>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/inventory/units?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch measurement units', response.status, errorData);
    }
    const data: IPaginatedResult<IIngredientUnit> = await response.json();
    return data;
};

export const getIngredientUnitById = async (id: string): Promise<IIngredientUnit> => {
    const response = await api.get(`/inventory/units/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch unit details', response.status, errorData);
    }
    return response.json();
};

export const createIngredientUnit = async (payload: ICreateIngredientUnitPayload): Promise<IIngredientUnit> => {
    const response = await api.post('/inventory/units', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create measurement unit', response.status, errorData);
    }
    return response.json();
};

export const updateIngredientUnit = async (id: string, payload: IUpdateIngredientUnitPayload): Promise<IIngredientUnit> => {
    const response = await api.put(`/inventory/units/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update unit details', response.status, errorData);
    }
    return response.json();
};

export const deleteIngredientUnit = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/inventory/units/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete measurement unit', response.status, errorData);
    }
    return response.json();
};

export const restoreIngredientUnit = async (id: string): Promise<IIngredientUnit> => {
    const response = await api.patch(`/inventory/units/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore measurement unit', response.status, errorData);
    }
    return response.json();
};

// =============================================================================
// Raw Ingredients API
// =============================================================================
export const getIngredients = async (params: IGetIngredientsParams): Promise<IPaginatedResult<IIngredient>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/inventory/ingredients?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch raw ingredients list', response.status, errorData);
    }
    const data: IPaginatedResult<IIngredient> = await response.json();
    return data;
};

export const getIngredientById = async (id: string): Promise<IIngredient> => {
    const response = await api.get(`/inventory/ingredients/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch ingredient details', response.status, errorData);
    }
    return response.json();
};

export const createIngredient = async (payload: ICreateIngredientPayload): Promise<IIngredient> => {
    const response = await api.post('/inventory/ingredients', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to register raw ingredient', response.status, errorData);
    }
    return response.json();
};

export const updateIngredient = async (id: string, payload: IUpdateIngredientPayload): Promise<IIngredient> => {
    const response = await api.put(`/inventory/ingredients/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update ingredient details', response.status, errorData);
    }
    return response.json();
};

export const deleteIngredient = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/inventory/ingredients/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete raw ingredient', response.status, errorData);
    }
    return response.json();
};

export const restoreIngredient = async (id: string): Promise<IIngredient> => {
    const response = await api.patch(`/inventory/ingredients/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore raw ingredient', response.status, errorData);
    }
    return response.json();
};

// =============================================================================
// Live Stock Levels & Physical Count Overwrite
// =============================================================================
export const getInventoryLevels = async (params: IGetInventoryLevelsParams): Promise<IPaginatedResult<IIngredientInventory>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.recordStatus) query.set('recordStatus', params.recordStatus);

    const response = await api.get(`/inventory/levels?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch live inventory levels', response.status, errorData);
    }
    const data: IPaginatedResult<IIngredientInventory> = await response.json();
    return data;
};

export const getInventoryLevelByIngredientId = async (ingredientId: string): Promise<IIngredientInventory> => {
    const response = await api.get(`/inventory/levels/${ingredientId}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch ingredient live stock level', response.status, errorData);
    }
    return response.json();
};

export const updatePhysicalCount = async (ingredientId: string, currentQuantity: number): Promise<IIngredientInventory> => {
    const response = await api.put(`/inventory/ingredients/${ingredientId}/physical-count`, { currentQuantity });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update physical count', response.status, errorData);
    }
    return response.json();
};

// =============================================================================
// Supplier Deliveries Log
// =============================================================================
export const getDeliveries = async (params: IGetDeliveriesParams): Promise<IPaginatedResult<IDelivery>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/inventory/deliveries?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch supplier deliveries log', response.status, errorData);
    }
    const data: IPaginatedResult<IDelivery> = await response.json();
    return data;
};

export const createDelivery = async (payload: ICreateDeliveryPayload): Promise<IDelivery> => {
    const response = await api.post('/inventory/deliveries', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to log supplier delivery', response.status, errorData);
    }
    return response.json();
};

// =============================================================================
// Waste & Adjustments Log
// =============================================================================
export const getAdjustments = async (params: IGetAdjustmentsParams): Promise<IPaginatedResult<IAdjustment>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/inventory/adjustments?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch adjustments log', response.status, errorData);
    }
    const data: IPaginatedResult<IAdjustment> = await response.json();
    return data;
};

export const createAdjustment = async (payload: ICreateAdjustmentPayload): Promise<IAdjustment> => {
    const response = await api.post('/inventory/adjustments', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to log stock adjustment', response.status, errorData);
    }
    return response.json();
};

// =============================================================================
// Production Projections & Forecasting
// =============================================================================
export const getProductionForecast = async (): Promise<IForecast[]> => {
    const response = await api.get('/inventory/forecast');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to compute production forecasts', response.status, errorData);
    }
    const data: IForecast[] = (await response.json()) || [];
    return data;
};
