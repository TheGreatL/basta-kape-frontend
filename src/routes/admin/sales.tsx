import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SalesPage from '#/feature/sales/sales-page';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    dateFrom: z.string().catch(''),
    dateTo: z.string().catch('')
});

export const Route = createFileRoute('/admin/sales')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Sales Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: SalesPage
});

export type TSalesSearchSchema = z.infer<typeof searchParamsSchema>;
