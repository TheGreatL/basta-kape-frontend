import { api } from './api';
import { getAuthStore } from '../store/auth-store';
import { ApiError } from '../utils/error-handler';
import type { TLoginSchema, TRegisterSchema, TResetPasswordSchema, TChangePasswordSchema } from '../feature/auth/auth.schema';

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

export const getCurrentUser = async () => {
    const response = await api.get('/auth/me');

    // if (response.status === 401) {
    //     getAuthStore().logout();
    //     return null;
    // }

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to load current user', response.status, errorData);
    }

    return response.json();
};

export const logout = async () => {
    try {
        await api.post('/auth/logout', {});
    } catch (err) {
        // Ignore logout errors, just clear the store locally
    }
    getAuthStore().logout();
};

export const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Forgot password request failed', response.status, errorData);
    }
    return response.json();
};

export const resetPassword = async (data: TResetPasswordSchema) => {
    const response = await api.post('/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Reset password failed', response.status, errorData);
    }
    return response.json();
};

export const changePassword = async (data: TChangePasswordSchema) => {
    const response = await api.post('/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Change password failed', response.status, errorData);
    }
    return response.json();
};
