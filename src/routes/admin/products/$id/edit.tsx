import ProductEditPage from '#/feature/products/product-edit-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/products/$id/edit')({
    beforeLoad: () => {
        requirePermission(null, 'Products Management', 'update');
    },
    component: ProductEditPage
});
