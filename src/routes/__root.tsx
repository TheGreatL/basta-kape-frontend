import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import { TanStackQueryDevtools, TanstackQueryProvider } from '../lib/query-client';

import appCss from '../styles.css?url';

import type { QueryClient } from '@tanstack/react-query';
import ErrorPage from '../components/errors/error-page';
import NotFoundPage from '../components/errors/not-found-page';

import { getAuthStore, waitForAuthHydration } from '#/store/auth-store';
import { restoreSession, getCurrentUser } from '#/api/auth.api';
import { Toaster } from '#/components/ui/sonner';
import { getStoreSettings } from '#/api/store-settings.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';

interface MyRouterContext {
    queryClient: QueryClient;
    auth: typeof getAuthStore;
}

let authInitialized = false;

const initAuth = async (context: MyRouterContext) => {
    if (typeof window === 'undefined' || authInitialized) return;
    authInitialized = true;

    await waitForAuthHydration();

    if (!context.auth().user) {
        await restoreSession().catch(() => null);

        if (!context.auth().user) {
            const accessToken = getAuthStore().accessToken;
            if (accessToken) {
                const user = await getCurrentUser().catch(() => null);
                if (user) {
                    getAuthStore().setAuth(user, accessToken);
                }
            }
        }
    }
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
    beforeLoad: async ({ context }) => {
        await initAuth(context);

        const user = context.auth().user;
        if (user) {
            await context.queryClient
                .prefetchQuery({
                    queryKey: [QUERY_KEY.STORE_SETTINGS.ACTIVE],
                    queryFn: getStoreSettings
                })
                .catch(() => null);
        }
    },
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
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <TanstackQueryProvider>{children}</TanstackQueryProvider>
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
