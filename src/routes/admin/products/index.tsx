import ProductsPage from '#/feature/products/products-page';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requirePermission } from '#/utils/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    pageSize: z.number().catch(10),
    search: z.string().catch(''),
    status: z.enum(['active', 'archive']).catch('active'),
    productCategoryId: z.string().catch(''),
    productTypeId: z.string().catch('')
});

export const Route = createFileRoute('/admin/products/')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: ProductsPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Products Management', 'read');
    }
});

export type TProductsSearchSchema = z.infer<typeof searchParamsSchema>;
