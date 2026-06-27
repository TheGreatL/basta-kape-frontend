import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IPaginatedResult } from '../types/base.types';
import type {
    IGetUsersListParams,
    IUserListItem,
    ICreateUserPayload,
    IUpdateUserPayload,
    IUpdateMyProfilePayload
} from '../feature/users/users.types';

export const getUsersList = async (params: IGetUsersListParams): Promise<IPaginatedResult<IUserListItem>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.role) query.set('role', params.role);

    const response = await api.get(`/users/list?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch users list', response.status, errorData);
    }
    return response.json();
};

export const getUserById = async (id: string): Promise<IUserListItem> => {
    const response = await api.get(`/users/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(`Failed to fetch user details`, response.status, errorData);
    }
    return response.json();
};

export const createUser = async (payload: ICreateUserPayload): Promise<IUserListItem> => {
    const response = await api.post('/users', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to create user account', response.status, errorData);
    }
    return response.json();
};

export const updateUser = async (id: string, payload: IUpdateUserPayload): Promise<IUserListItem> => {
    const response = await api.put(`/users/${id}`, payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update user profile', response.status, errorData);
    }
    return response.json();
};

export const updateMyProfile = async (payload: IUpdateMyProfilePayload): Promise<IUserListItem> => {
    const response = await api.put('/users/me', payload);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to update profile', response.status, errorData);
    }
    return response.json();
};

export const deleteUser = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/users/${id}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to delete user profile', response.status, errorData);
    }
    return response.json();
};

export const uploadProfilePicture = async (id: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/users/${id}/profile-picture`, formData);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to upload profile picture', response.status, errorData);
    }
    return response.json();
};

export const restoreUser = async (id: string): Promise<IUserListItem> => {
    const response = await api.patch(`/users/${id}/restore`, {});
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to restore user profile', response.status, errorData);
    }
    return response.json();
};
