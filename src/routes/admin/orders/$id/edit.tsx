import OrderEditPage from '#/feature/order/order-edit-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/orders/$id/edit')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Orders Management', 'update');
    },
    component: OrderEditPage
});
