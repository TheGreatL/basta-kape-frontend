import OrderViewPage from '#/feature/order/order-view-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/orders/$id/')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Orders Management', 'read');
    },
    component: OrderViewPage
});
