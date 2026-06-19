import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

import { createQueryClient } from './lib/query-client';
import LoadingPage from '#/components/layout/loading-page';

import ErrorPage from './components/errors/error-page';
import NotFoundPage from './components/errors/not-found-page';

const queryClient = createQueryClient();

export const router = createTanStackRouter({
    routeTree,
    context: {
        queryClient,
        auth: undefined!
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: LoadingPage,
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
