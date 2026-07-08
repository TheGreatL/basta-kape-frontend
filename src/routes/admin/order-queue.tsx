import { createFileRoute } from '@tanstack/react-router';
import OrderQueuePage from '#/feature/order/order-queue-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/order-queue')({
    component: OrderQueuePage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Order Queue', 'read');
    }
});
