import { createFileRoute } from '@tanstack/react-router';

import OrderDetailsPage from '#/feature/customer/order-details-page';

export const Route = createFileRoute('/_customer/orders/$id')({
    component: OrderDetailsPage
});
