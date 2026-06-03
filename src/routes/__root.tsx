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
import { BUSINESS_DETAIL } from '#/constants/business-details.ts';

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
                title: BUSINESS_DETAIL.NAME
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
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <TanstackQueryProvider>{children}</TanstackQueryProvider>
                <Toaster position="top-right" richColors={true} closeButton={true} />
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
                <Scripts />
            </body>
        </html>
    );
}
