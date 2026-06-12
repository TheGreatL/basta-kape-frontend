import { api } from './api';
import { ApiError } from '../utils/error-handler';
import type { IRegisterShift, IOpenShift, ICloseShift, IGetRegisterShiftsParams } from '../feature/register-shifts/register-shifts.types';
import type { IPaginatedResult } from '../types/base.types';

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

export const getRegisterShifts = async (params: IGetRegisterShiftsParams): Promise<IPaginatedResult<IRegisterShift>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/register-shifts?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch register shifts list', response.status, errorData);
    }
    return response.json();
};

export const getMyRegisterShifts = async (params: IGetRegisterShiftsParams): Promise<IPaginatedResult<IRegisterShift>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const response = await api.get(`/register-shifts/my-shifts?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch your register shifts list', response.status, errorData);
    }
    return response.json();
};
