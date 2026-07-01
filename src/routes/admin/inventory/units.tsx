import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
// import UnitsPage from '#/feature/inventory/units/units-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/inventory/units')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    // component: UnitsPage,
    component: () => {
        return <div>Units Page</div>;
    },
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TUnitsSearchSchema = z.infer<typeof searchParamsSchema>;
