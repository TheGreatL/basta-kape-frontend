import { HeadContent, Scripts, createRootRouteWithContext, useRouteContext } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { QueryClientProvider } from '@tanstack/react-query';

import { TanStackQueryDevtools } from '../lib/query-client';

import appCss from '../styles.css?url';

import type { QueryClient } from '@tanstack/react-query';
import ErrorPage from '../components/errors/error-page';
import NotFoundPage from '../components/errors/not-found-page';

import { AuthProvider } from '#/context/AuthContext';
import type { useAuth } from '#/context/AuthContext';
import { Toaster } from '#/components/ui/sonner';

interface MyRouterContext {
    queryClient: QueryClient;
    auth: ReturnType<typeof useAuth>;
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
                title: 'Basta Kape'
            }
        ],
        links: [
            {
                rel: 'stylesheet',
                href: appCss
            },
            {
                rel: 'icon',
                type: 'image/x-icon',
                href: '/favicons/favicon.ico'
            },
            {
                rel: 'icon',
                type: 'image/png',
                sizes: '16x16',
                href: '/favicons/favicon-16x16.png'
            },
            {
                rel: 'icon',
                type: 'image/png',
                sizes: '32x32',
                href: '/favicons/favicon-32x32.png'
            },
            {
                rel: 'apple-touch-icon',
                sizes: '180x180',
                href: '/favicons/apple-touch-icon.png'
            },
            {
                rel: 'manifest',
                href: '/manifest.json'
            }
        ]
    }),
    errorComponent: ErrorPage,
    notFoundComponent: NotFoundPage,
    shellComponent: RootDocument
});

function RootDocument({ children }: { children: React.ReactNode }) {
    const { queryClient } = useRouteContext({ from: '__root__' });

    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>{children}</AuthProvider>
                </QueryClientProvider>
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
                <Scripts />
            </body>
        </html>
    );
}
