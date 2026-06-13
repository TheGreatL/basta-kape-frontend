import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PurchaseOrdersPage from '#/feature/purchase-orders/purchase-orders-page';
import { requirePermission } from '#/utils/rbac.ts';
import { waitForAuthHydration } from '#/store/auth-store.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED', '']).catch(''),
    supplierId: z.string().catch('')
});

export const Route = createFileRoute('/admin/purchase-orders')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        requirePermission(null, 'Purchase Orders Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: PurchaseOrdersPage
});

export type TPurchaseOrdersSearchSchema = z.infer<typeof searchParamsSchema>;
