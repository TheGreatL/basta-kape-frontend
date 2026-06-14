import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import OrdersPage from '#/feature/order/orders-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', '']).catch(''),
    orderType: z.enum(['DINE_IN', 'TAKE_OUT', 'DELIVERY', '']).catch(''),
    orderSource: z.enum(['POS', 'MOBILE_APP', 'WEBSITE', 'DELIVERY_PARTNER', '']).catch('')
});

export const Route = createFileRoute('/admin/orders/')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, 'Orders Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: OrdersPage
});

export type TOrdersSearchSchema = z.infer<typeof searchParamsSchema>;
