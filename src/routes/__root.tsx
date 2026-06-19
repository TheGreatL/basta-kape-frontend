import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { TanStackQueryDevtools } from '../lib/query-client';
import ErrorPage from '../components/errors/error-page';
import NotFoundPage from '../components/errors/not-found-page';
import type { AuthContextType } from '#/context/AuthContext';
import { Toaster } from '#/components/ui/sonner';

interface MyRouterContext {
    queryClient: QueryClient;
    auth: AuthContextType;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    errorComponent: ErrorPage,
    notFoundComponent: NotFoundPage,
    component: RootComponent
});

function RootComponent() {
    return (
        <>
            <Outlet />
            <Toaster position="top-right" richColors={true} closeButton={true} />
            {import.meta.env.DEV ? (
                <TanStackDevtools
                    config={{
                        position: 'bottom-right'
                    }}
                    plugins={[
                        {
                            name: 'Tanstack Router',
                            render: <TanStackRouterDevtoolsPanel />
                        },
                        TanStackQueryDevtools
                    ]}
                />
            ) : null}
        </>
    );
}
