import ProductViewPage from '#/feature/products/product-view-page';
import { createFileRoute } from '@tanstack/react-router';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/products/$id/')({
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, 'Products Management', 'read');
    },
    component: ProductViewPage
});
