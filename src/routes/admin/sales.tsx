import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SalesPage from '#/feature/sales/sales-page';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    dateFrom: z.string().optional().catch(''),
    dateTo: z.string().optional().catch('')
});

export const Route = createFileRoute('/admin/sales')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: SalesPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, appModules.SALES_MANAGEMENT, appPermissions.READ);
    }
});

export type TSalesSearchSchema = z.infer<typeof searchParamsSchema>;
