import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ProjectionsPage from '#/feature/inventory/projections/projections-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    search: z.string().catch('')
});

export const Route = createFileRoute('/admin/inventory/projections')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ProjectionsPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Inventory Management', 'read');
    }
});

export type TProjectionsSearchSchema = z.infer<typeof searchParamsSchema>;
