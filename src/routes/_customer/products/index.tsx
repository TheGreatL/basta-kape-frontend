import { createFileRoute } from '@tanstack/react-router';
import ProductsPage from '#/feature/customer/products-page.tsx';

export const Route = createFileRoute('/_customer/products/')({
    component: ProductsPage
});
