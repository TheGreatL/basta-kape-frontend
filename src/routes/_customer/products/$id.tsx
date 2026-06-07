import { createFileRoute } from '@tanstack/react-router';
import ProductDetailPage from '#/feature/customer/product-detail-page.tsx';

export const Route = createFileRoute('/_customer/products/$id')({
    component: ProductDetailRouteComponent
});

function ProductDetailRouteComponent() {
    const { id } = Route.useParams();
    return <ProductDetailPage productId={id} />;
}
