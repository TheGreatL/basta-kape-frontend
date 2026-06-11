import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/register-shifts')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/admin/register-shifts"!</div>;
}
