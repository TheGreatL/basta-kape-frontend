import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import WasteLogPage from '#/feature/inventory/waste-log/waste-log-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    category: z.enum(['ALL', 'PREPARED_FOOD', 'RAW_INGREDIENT']).catch('ALL'),
    reason: z
        .enum([
            'ALL',
            'EXPIRED',
            'SPOILED',
            'WASTE',
            'SAMPLING',
            'THEFT',
            'PROMOTIONAL_USE',
            'DISPOSED',
            'PHYSICAL_COUNT_CORRECTION',
            'PHYSICAL_COUNT_DISCREPANCY'
        ])
        .catch('ALL'),
    startDate: z.string().catch(''),
    endDate: z.string().catch('')
});

export const Route = createFileRoute('/admin/inventory/waste-log')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: WasteLogPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TWasteLogSearchSchema = z.infer<typeof searchParamsSchema>;
