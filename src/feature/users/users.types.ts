import type { IPaginationParams } from '#/types/base.types';

export interface IGetUsersListParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
    role?: string;
}

export interface IRoleInfo {
    id: string;
    name: string;
}

export interface IUserRoleRelation {
    role: IRoleInfo;
}

export interface IUserListItem {
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
    userRoles: IUserRoleRelation[];
}

export interface ICreateUserPayload {
    email: string;
    username: string;
    password?: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phoneNumber?: string | null;
    roleIds?: string[];
}

export interface IUpdateUserPayload {
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    phoneNumber?: string | null;
    roleIds?: string[];
}

export interface IUpdateMyProfilePayload {
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    phoneNumber?: string | null;
    email?: string;
    username?: string;
}

export interface UsersTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    role: string;
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
    onRoleChange: (role: string) => void;
}
