import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import InventoryPage from '#/feature/inventory/inventory-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    tab: z.enum(['levels', 'forecast', 'deliveries', 'adjustments', 'ingredients', 'units']).catch('levels'),

    // Levels Tab parameters
    lPage: z.number().catch(1),
    lPageSize: z.number().catch(10),
    lSearch: z.string().catch(''),
    lStatus: z.enum(['SAFE', 'CRITICAL', 'OUT_OF_STOCK', '']).catch(''),

    // Forecast Tab parameters
    fSearch: z.string().catch(''),

    // Deliveries Tab parameters
    dPage: z.number().catch(1),
    dPageSize: z.number().catch(10),
    dSearch: z.string().catch(''),

    // Adjustments Tab parameters
    adjPage: z.number().catch(1),
    adjPageSize: z.number().catch(10),
    adjSearch: z.string().catch(''),

    // Ingredients Tab parameters
    iPage: z.number().catch(1),
    iPageSize: z.number().catch(10),
    iSearch: z.string().catch(''),
    iStatus: z.enum(['active', 'archive']).catch('active'),

    // Units Tab parameters
    uPage: z.number().catch(1),
    uPageSize: z.number().catch(10),
    uSearch: z.string().catch(''),
    uStatus: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/inventory')({
    beforeLoad: () => {
        requirePermission(null, 'Inventory Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: InventoryPage
});

export type TInventorySearchSchema = z.infer<typeof searchParamsSchema>;
