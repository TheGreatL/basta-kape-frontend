import type { IPaginationParams } from '#/types/base.types';

export interface ModulePermissionNode {
    modulePermissionId: string;
    scope: 'ALL' | 'STORE' | 'OWN';
}

export interface RolePermissionPayload {
    modulePermissionId: string;
    scope: 'ALL' | 'STORE' | 'OWN';
}

export interface CreateRolePayload {
    name: string;
    description?: string;
    permissions: RolePermissionPayload[];
}

export interface UpdateRolePayload {
    name?: string;
    description?: string;
    permissions?: RolePermissionPayload[];
}

export interface IRoleListItem {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ISystemPermission {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
}

export interface ISystemModule {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
}

export interface IGetRolesListParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
}

export interface IGetPermissionsListParams extends IPaginationParams {
    search?: string;
}

export interface IGetModulesListParams extends IPaginationParams {
    search?: string;
}

export interface ModuleTabProps {
    page: number;
    pageSize: number;
    search: string;
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
}

export interface PermissionTabProps {
    page: number;
    pageSize: number;
    search: string;
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
}

export interface RoleTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
}
