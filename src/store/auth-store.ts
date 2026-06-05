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
    _hasHydrated: boolean;
    setAuth: (user: User, accessToken: string) => void;
    setAccessToken: (accessToken: string | null) => void;
    setHasHydrated: (state: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            _hasHydrated: false,
            setAuth: (user, accessToken) => set({ user, accessToken }),
            setAccessToken: (accessToken) => set({ accessToken }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            logout: () => set({ user: null, accessToken: null })
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique),
            // Persist user & permissions; accessToken is in-memory only
            // refreshToken is managed via HttpOnly cookie by the server
            partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            }
        }
    )
);

// Helper for non-react code (like api.ts)
export const getAuthStore = () => useAuthStore.getState();

export const waitForAuthHydration = () => {
    return new Promise<void>((resolve) => {
        const state = useAuthStore.getState();
        if (state._hasHydrated) {
            resolve();
            return;
        }

        const unsubscribe = useAuthStore.subscribe((currState) => {
            if (currState._hasHydrated) {
                unsubscribe();
                resolve();
            }
        });
    });
};
