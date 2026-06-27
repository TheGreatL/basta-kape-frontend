import { createFileRoute } from '@tanstack/react-router';
import CustomerDetailPage from '#/feature/customer-management/customer-detail-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/customers/$slug/')({
    component: CustomerDetailPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Customers Management', 'read');
    }
});
