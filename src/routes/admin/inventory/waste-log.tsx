import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import WasteLogPage from '#/feature/inventory/waste-log/waste-log-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().optional().default(1).catch(1),
    pageSize: z.number().optional().default(10).catch(10),
    search: z.string().optional().default('').catch(''),
    category: z.enum(['ALL', 'PREPARED_FOOD', 'RAW_INGREDIENT']).optional().default('ALL').catch('ALL'),
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
        .optional()
        .default('ALL')
        .catch('ALL'),
    startDate: z.string().optional().default('').catch(''),
    endDate: z.string().optional().default('').catch('')
});

export const Route = createFileRoute('/admin/inventory/waste-log')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: WasteLogPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TWasteLogSearchSchema = z.infer<typeof searchParamsSchema>;
