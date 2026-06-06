import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SuppliersPage from '#/feature/suppliers/suppliers-page';
import { requirePermission } from '#/utils/rbac.ts';
import { waitForAuthHydration } from '#/store/auth-store.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active')
});

export const Route = createFileRoute('/admin/suppliers')({
    beforeLoad: async () => {
        await waitForAuthHydration();
        requirePermission(null, 'Suppliers Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: SuppliersPage
});

export type TSupplierSearchSchema = z.infer<typeof searchParamsSchema>;
