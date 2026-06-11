import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IRegisterShift, IOpenShift, ICloseShift } from '../feature/register-shifts/register-shifts.types';

export const getActiveRegisterShift = async (): Promise<IRegisterShift> => {
    const response = await api.get('/register-shifts/active');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch active register shift', response.status, errorData);
    }
    return response.json();
};

export const openRegisterShift = async (data: IOpenShift): Promise<IRegisterShift> => {
    const response = await api.post('/register-shifts/open', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to open register shift', response.status, errorData);
    }
    return response.json();
};

export const closeRegisterShift = async (data: ICloseShift): Promise<IRegisterShift> => {
    const response = await api.post('/register-shifts/close', data);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to close register shift', response.status, errorData);
    }
    return response.json();
};
