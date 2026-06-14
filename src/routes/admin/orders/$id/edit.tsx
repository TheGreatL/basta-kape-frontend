import OrderEditPage from '#/feature/order/order-edit-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

export const Route = createFileRoute('/admin/orders/$id/edit')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Orders Management', 'update');
    },
    component: OrderEditPage
});
