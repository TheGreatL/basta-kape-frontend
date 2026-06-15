import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import ReportsPage from '#/feature/reports/reports-page';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    module: z.string().catch(''),
    page: z.number().catch(1),
    pageSize: z.number().catch(20),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active'),
    dateFrom: z.string().catch(''),
    dateTo: z.string().catch(''),
    productCategoryId: z.string().catch(''),
    productTypeId: z.string().catch(''),
    inventoryStatus: z.enum(['SAFE', 'CRITICAL', 'OUT_OF_STOCK', '']).catch(''),
    orderStatus: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', '']).catch(''),
    orderType: z.enum(['DINE_IN', 'TAKE_OUT', 'DELIVERY', '']).catch('')
});

export const Route = createFileRoute('/admin/reports')({
    beforeLoad: () => {
        requirePermission(null, appModules.REPORTS_MANAGEMENT, appPermissions.READ);
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ReportsPage
});

export type TReportsSearchSchema = z.infer<typeof searchParamsSchema>;
