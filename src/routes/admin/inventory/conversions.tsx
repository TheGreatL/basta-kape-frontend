import { createFileRoute, redirect } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/inventory/conversions')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
        throw redirect({
            to: '/admin/inventory/units',
            search: {
                tab: 'conversions',
                page: 1,
                pageSize: 10,
                search: '',
                status: 'active',
                category: ''
            }
        });
    }
});
