import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(customer)/product/')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/(customer)/products"!</div>;
}
