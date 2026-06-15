import { createFileRoute } from '@tanstack/react-router';

import OrderDetailsPage from '#/feature/customer/order-details-page';

export const Route = createFileRoute('/_customer/_protected/orders/$id')({
    component: OrderDetailsPage
});
