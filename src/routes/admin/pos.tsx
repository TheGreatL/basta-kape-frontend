import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/pos')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/admin/pos"!</div>;
}
