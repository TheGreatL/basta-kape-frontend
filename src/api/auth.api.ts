import { api } from './api';
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

export const getCurrentUser = async () => {
    const response = await api.get('/auth/me');

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to load current user', response.status, errorData);
    }

    return response.json();
};

export const logout = async () => {
    try {
        await api.post('/auth/logout', {}, { skipAuth: true });
    } catch (err) {
        // Ignore API errors
    }
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
