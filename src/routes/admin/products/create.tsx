import ProductCreatePage from '#/feature/products/product-create-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/products/create')({
    beforeLoad: () => {
        requirePermission(null, 'Products Management', 'create');
    },
    component: ProductCreatePage
});
