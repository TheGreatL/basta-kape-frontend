import { create } from 'zustand';
import { getActiveRegisterShift, openRegisterShift, closeRegisterShift } from '#/api/register-shift.api.ts';
import type { IRegisterShift, IOpenShift, ICloseShift } from '#/feature/register-shifts/register-shifts.types.ts';
import { ApiError } from '#/utils/error-handler.ts';

interface RegisterShiftState {
    activeShift: IRegisterShift | null;
    isLoading: boolean;
    hasChecked: boolean;
    fetchActiveShift: () => Promise<IRegisterShift | null>;
    openShift: (data: IOpenShift) => Promise<IRegisterShift>;
    closeShift: (data: ICloseShift) => Promise<IRegisterShift>;
    clearShift: () => void;
}

export const useRegisterShiftStore = create<RegisterShiftState>((set) => ({
    activeShift: null,
    isLoading: false,
    hasChecked: false,

    fetchActiveShift: async () => {
        set({ isLoading: true });
        try {
            const shift = await getActiveRegisterShift();
            set({ activeShift: shift, hasChecked: true });
            return shift;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                // No active shift, which is expected for cashiers on login
                set({ activeShift: null, hasChecked: true });
            } else {
                console.error('Failed to load active register shift session:', error);
                set({ activeShift: null, hasChecked: true });
            }
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    openShift: async (data: IOpenShift) => {
        set({ isLoading: true });
        try {
            const shift = await openRegisterShift(data);
            set({ activeShift: shift });
            return shift;
        } catch (error) {
            console.error('Failed to open register shift:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    closeShift: async (data: ICloseShift) => {
        set({ isLoading: true });
        try {
            const shift = await closeRegisterShift(data);
            set({ activeShift: null });
            return shift;
        } catch (error) {
            console.error('Failed to close register shift:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    clearShift: () => {
        set({ activeShift: null, hasChecked: false });
    }
}));
