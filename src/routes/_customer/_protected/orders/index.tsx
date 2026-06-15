import { createFileRoute } from '@tanstack/react-router';
import OrdersPage from '#/feature/customer/orders-page.tsx';

export const Route = createFileRoute('/_customer/_protected/orders/')({
    component: OrdersPage
});
