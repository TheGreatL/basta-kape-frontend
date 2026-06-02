import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import type { ReactNode } from 'react';

export function createQueryClient() {
    return new QueryClient();
}

export function TanstackQueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => createQueryClient());

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export const TanStackQueryDevtools = {
    name: 'Tanstack Query',
    render: <ReactQueryDevtoolsPanel />
};
