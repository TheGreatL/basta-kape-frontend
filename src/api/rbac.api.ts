import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    CreateRolePayload,
    UpdateRolePayload,
    IRoleListItem,
    ISystemPermission,
    ISystemModule,
    IGetRolesListParams,
    IGetPermissionsListParams,
    IGetModulesListParams
} from '../feature/rbac/rbac.types';

// 1. Roles & Tree Management
export const getModulesPermissions = async () => {
    const response = await api.get('/rbac/roles/modules-permissions');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch modules permissions tree', response.status, errorData);
    }
    return response.json();
};

export const getRolesList = async (params: IGetRolesListParams): Promise<IPaginatedResult<IRoleListItem>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const response = await api.get(`/rbac/roles/list?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch roles list', response.status, errorData);
    }
    return response.json();
};

export const getRoleByName = async (name: string) => {
    const response = await api.get(`/rbac/roles/${encodeURIComponent(name)}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(`Failed to fetch role: ${name}`, response.status, errorData);
    }
    return response.json();
};

export const createRole = async (payload: CreateRolePayload) => {
    const response = await api.post('/rbac/roles', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create role', response.status, errorData);
    }
    return response.json();
};

export const updateRole = async (id: string, payload: UpdateRolePayload) => {
    const response = await api.put(`/rbac/roles/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update role', response.status, errorData);
    }
    return response.json();
};

export const deleteRole = async (id: string) => {
    const response = await api.delete(`/rbac/roles/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete role', response.status, errorData);
    }
    return response.json();
};

// 2. Action Permissions Directory
export const getPermissionsList = async (params: IGetPermissionsListParams): Promise<IPaginatedResult<ISystemPermission>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/rbac/permissions/list?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch permissions list', response.status, errorData);
    }
    return response.json();
};

// 3. System Modules Directory
export const getModulesList = async (params: IGetModulesListParams): Promise<IPaginatedResult<ISystemModule>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/rbac/modules/list?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch modules list', response.status, errorData);
    }
    return response.json();
};
