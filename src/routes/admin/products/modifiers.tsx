import ModifiersPage from '#/feature/modifier/modifier-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    productId: z.string().catch('')
});

export const Route = createFileRoute('/admin/products/modifiers')({
    beforeLoad: () => {
        requirePermission(null, 'Products Management', 'read');
    },
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ModifiersPage
});

export type TModifiersSearchSchema = z.infer<typeof searchParamsSchema>;
