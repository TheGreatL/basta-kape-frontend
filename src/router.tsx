import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { createQueryClient } from './lib/query-client';
import LoadingPage from '#/components/layout/loading-page';

import { getAccessToken } from './api/api';
import type { useAuth } from './context/AuthContext';
import ErrorPage from './components/errors/error-page';
import NotFoundPage from './components/errors/not-found-page';

import QUERY_KEYS from './constants/query-keys';

export function getRouter() {
    const queryClient = createQueryClient();
    const context = {
        queryClient,
        auth: {
            get user() {
                const token = getAccessToken();
                if (!token) return null;
                return queryClient.getQueryData([QUERY_KEYS.AUTH.ME, token]) || null;
            },
            get accessToken() {
                return getAccessToken();
            },
            get isAuthenticated() {
                const token = getAccessToken();
                if (!token) return false;
                return !!queryClient.getQueryData([QUERY_KEYS.AUTH.ME, token]);
            },
            get isLoading() {
                const token = getAccessToken();
                if (!token) return false;
                const state = queryClient.getQueryState([QUERY_KEYS.AUTH.ME, token]);
                if (!state) return true;
                return state.status === 'pending' || state.fetchStatus === 'fetching';
            },
            login: () => Promise.reject(new Error('Not implemented')),
            register: () => Promise.reject(new Error('Not implemented')),
            logout: () => Promise.reject(new Error('Not implemented'))
        } as unknown as ReturnType<typeof useAuth>
    };

    const router = createTanStackRouter({
        routeTree,
        context,
        scrollRestoration: true,
        defaultPreload: 'intent',
        defaultPreloadStaleTime: 0,
        defaultPendingComponent: LoadingPage,
        defaultErrorComponent: ErrorPage,
        defaultNotFoundComponent: NotFoundPage
    });

    setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

    return router;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
