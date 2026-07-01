import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
// import InventoryDashboardPage from '#/feature/inventory/dashboard/dashboard-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    // Inventory dashboard has no search params for now
});

export const Route = createFileRoute('/admin/inventory/')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    // component: InventoryDashboardPage,
    component: () => {
        return <div>Inventory Dashboard Page</div>;
    },
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TInventoryDashboardSearchSchema = z.infer<typeof searchParamsSchema>;
