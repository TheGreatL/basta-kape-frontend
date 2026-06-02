import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: Array<{
        name: string;
        permissions: Array<{
            module: string;
            permission: string;
            scope: string;
        }>;
    }>;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    setAccessToken: (accessToken: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
            setAccessToken: (accessToken) => set({ accessToken }),
            logout: () => set({ user: null, accessToken: null, refreshToken: null })
        }),
        {
            name: 'auth-storage' // name of the item in the storage (must be unique)
        }
    )
);

// Helper for non-react code (like api.ts)
export const getAuthStore = () => useAuthStore.getState();
