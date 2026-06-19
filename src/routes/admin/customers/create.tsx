import { createFileRoute } from '@tanstack/react-router';
import CustomerCreatePage from '#/feature/customer-management/customer-create-page';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/customers/create')({
    component: CustomerCreatePage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Customers Management', 'create');
    }
});
