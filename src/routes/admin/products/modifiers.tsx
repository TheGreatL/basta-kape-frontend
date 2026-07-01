// import ModifiersPage from '#/feature/modifier/modifier-page';
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
    validateSearch: (search) => searchParamsSchema.parse(search),
    // component: ModifiersPage,
    component: () => {
        return <div>Modifiers Page</div>;
    },
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Products Management', 'read');
    }
});

export type TModifiersSearchSchema = z.infer<typeof searchParamsSchema>;
