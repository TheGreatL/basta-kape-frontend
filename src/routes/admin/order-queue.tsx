import { createFileRoute } from '@tanstack/react-router';
import OrderQueuePage from '#/feature/order/order-queue-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

export const Route = createFileRoute('/admin/order-queue')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Order Queue', 'read');
    },
    component: OrderQueuePage
});
