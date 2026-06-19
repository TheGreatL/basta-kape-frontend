import OrderCreatePage from '#/feature/order/order-create-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/orders/create')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Orders Management', 'create');
    },
    component: OrderCreatePage
});
