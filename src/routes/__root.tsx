import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import { TanStackQueryDevtools, TanstackQueryProvider } from '../lib/query-client';

import appCss from '../styles.css?url';

import type { QueryClient } from '@tanstack/react-query';
import ErrorPage from '../components/errors/error-page';
import NotFoundPage from '../components/errors/not-found-page';

import type { getAuthStore } from '../store/auth-store';
import { Toaster } from '#/components/ui/sonner';

interface MyRouterContext {
    queryClient: QueryClient;
    auth: typeof getAuthStore;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8'
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1'
            },
            {
                title: 'TanStack Start Starter'
            }
        ],
        links: [
            {
                rel: 'stylesheet',
                href: appCss
            }
        ]
    }),
    errorComponent: ErrorPage,
    notFoundComponent: NotFoundPage,
    shellComponent: RootDocument
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <TanstackQueryProvider>{children}</TanstackQueryProvider>
                <Toaster position="top-right" richColors closeButton />
                {import.meta.env.DEV && (
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
                )}
                <Scripts />
            </body>
        </html>
    );
}
