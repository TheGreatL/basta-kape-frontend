import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import MenuPage from '#/feature/menu/menu-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(12),
    search: z.string().catch(''),
    productCategoryId: z.string().catch(''),
    productTypeId: z.string().catch('')
});

export const Route = createFileRoute('/admin/menu')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: MenuPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Menu', 'read');
    }
});
