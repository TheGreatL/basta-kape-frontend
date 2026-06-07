import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/orders/$id')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/(customer)/order/slug"!</div>;
}
