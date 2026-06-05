import { api } from './api';
import { getAuthStore } from '../store/auth-store';
import { ApiError } from '../utils/error-handler';
import type { TLoginSchema, TRegisterSchema } from '../feature/auth/auth.schema';

export const login = async (data: TLoginSchema) => {
    const response = await api.post('/auth/login', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Login failed', response.status, errorData);
    }
    return response.json();
};

export const register = async (data: TRegisterSchema) => {
    const response = await api.post('/auth/register', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Registration failed', response.status, errorData);
    }
    return response.json();
};

export const restoreSession = async () => {
    const response = await api.post('/auth/refresh', {});

    if (response.status === 401) {
        getAuthStore().logout();
        return null;
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Session restore failed', response.status, errorData);
    }

    const data = await response.json();
    getAuthStore().setAuth(data.user, data.accessToken);
    return data;
};

export const logout = async () => {
    try {
        await api.post('/auth/logout', {});
    } catch (err) {
        // Ignore logout errors, just clear the store locally
    }
    getAuthStore().logout();
};
