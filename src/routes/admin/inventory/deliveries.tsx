import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import DeliveriesPage from '#/feature/inventory/deliveries/deliveries-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch('')
});

export const Route = createFileRoute('/admin/inventory/deliveries')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: DeliveriesPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TDeliveriesSearchSchema = z.infer<typeof searchParamsSchema>;
