import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/checkout')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/_customer/checkout"!</div>;
}
