import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { env } from '../env';
import QUERY_KEYS from '../constants/query-keys';
import { getAccessToken, setAccessToken, logout as apiLogoutLocal } from '../api/api';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from '../api/auth.api';

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

export interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: any) => Promise<User>;
    register: (credentials: any) => Promise<User>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setTokenState] = useState<string | null>(getAccessToken());
    const [isInitializing, setIsInitializing] = useState(true);
    const queryClient = useQueryClient();

    // Listen to token updates from api.ts (e.g. from silent refresh or intercepts)
    useEffect(() => {
        const handleTokenEvent = (e: Event) => {
            const customEvent = e as CustomEvent<string | null>;
            setTokenState(customEvent.detail);
        };
        window.addEventListener('auth:token', handleTokenEvent);
        return () => {
            window.removeEventListener('auth:token', handleTokenEvent);
        };
    }, []);

    // React Query to fetch and cache user profile
    const { data: user, isLoading: isUserLoading } = useQuery<User | null>({
        queryKey: [QUERY_KEYS.AUTH.ME, accessToken],
        queryFn: async () => {
            if (!accessToken) return null;
            return await getCurrentUser();
        },
        enabled: !!accessToken,
        retry: false,
        staleTime: 5 * 60 * 1000 // cache for 5 minutes
    });

    useEffect(() => {
        const initAuth = async () => {
            const token = getAccessToken();
            if (!token) {
                // No token cached, try silent refresh
                try {
                    const refreshUrl = `${env.VITE_API_URL}/auth/refresh`;
                    const response = await fetch(refreshUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const newToken = data.accessToken;
                        if (newToken) {
                            setAccessToken(newToken);
                            setTokenState(newToken);
                        }
                    } else {
                        apiLogoutLocal();
                        setTokenState(null);
                    }
                } catch {
                    apiLogoutLocal();
                    setTokenState(null);
                }
            }
            setIsInitializing(false);
        };

        initAuth();
    }, []);

    // Listen to logout events from API interceptor
    useEffect(() => {
        const handleLogoutEvent = () => {
            setTokenState(null);
            queryClient.clear();
        };

        window.addEventListener('auth:logout', handleLogoutEvent);
        return () => {
            window.removeEventListener('auth:logout', handleLogoutEvent);
        };
    }, [queryClient]);

    const login = async (credentials: any): Promise<User> => {
        const res = await apiLogin(credentials);
        setAccessToken(res.accessToken);
        setTokenState(res.accessToken);
        // Prefetch user profile and seed react-query cache
        const profile = await getCurrentUser();
        queryClient.setQueryData([QUERY_KEYS.AUTH.ME, res.accessToken], profile);
        return profile;
    };

    const register = async (credentials: any): Promise<User> => {
        const res = await apiRegister(credentials);
        setAccessToken(res.accessToken);
        setTokenState(res.accessToken);
        // Prefetch user profile and seed react-query cache
        const profile = await getCurrentUser();
        queryClient.setQueryData([QUERY_KEYS.AUTH.ME, res.accessToken], profile);
        return profile;
    };

    const logout = async () => {
        try {
            await apiLogout();
        } catch {
            // Ignore API errors to guarantee client logs out
        } finally {
            apiLogoutLocal();
            setTokenState(null);
            queryClient.clear();
        }
    };

    const isLoading = isInitializing || (!!accessToken && isUserLoading);

    const value: AuthContextType = {
        user: user || null,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
