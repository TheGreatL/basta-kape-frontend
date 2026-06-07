import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/orders/')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/(customer)/order"!</div>;
}
