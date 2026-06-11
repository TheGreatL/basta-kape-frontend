import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/products/recipes')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/admin/products/recipie"!</div>;
}
