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
        console.log('[DEBUG] waitForAuthHydration started. state:', {
            _hasHydrated: state._hasHydrated,
            hasHydratedInternal: (useAuthStore as any).persist?.hasHydrated?.(),
            user: state.user ? state.user.username : null
        });

        if (state._hasHydrated || (useAuthStore as any).persist?.hasHydrated?.()) {
            if (!state._hasHydrated) {
                useAuthStore.getState().setHasHydrated(true);
            }
            console.log('[DEBUG] waitForAuthHydration resolved immediately. user:', useAuthStore.getState().user?.username);
            resolve();
            return;
        }

        let resolved = false;
        const doResolve = (source: string) => {
            if (resolved) return;
            resolved = true;
            console.log('[DEBUG] waitForAuthHydration resolved via:', source, 'user:', useAuthStore.getState().user?.username);
            resolve();
        };

        const unsubscribe = useAuthStore.subscribe((currState) => {
            console.log('[DEBUG] subscription fired. state:', {
                _hasHydrated: currState._hasHydrated,
                hasHydratedInternal: (useAuthStore as any).persist?.hasHydrated?.(),
                user: currState.user ? currState.user.username : null
            });
            if (currState._hasHydrated || (useAuthStore as any).persist?.hasHydrated?.()) {
                if (!currState._hasHydrated) {
                    useAuthStore.getState().setHasHydrated(true);
                }
                unsubscribe();
                clearTimeout(timeoutId);
                doResolve('subscribe');
            }
        });

        const unsubFinish = (useAuthStore as any).persist.onFinishHydration(() => {
            console.log('[DEBUG] onFinishHydration fired. user:', useAuthStore.getState().user?.username);
            useAuthStore.getState().setHasHydrated(true);
            unsubscribe();
            if (unsubFinish) unsubFinish();
            clearTimeout(timeoutId);
            doResolve('onFinishHydration');
        });

        const timeoutId = setTimeout(() => {
            console.warn('[DEBUG] setTimeout fallback fired! user:', useAuthStore.getState().user?.username);
            unsubscribe();
            if (unsubFinish) unsubFinish();
            doResolve('timeout');
        }, 1000);
    });
};
