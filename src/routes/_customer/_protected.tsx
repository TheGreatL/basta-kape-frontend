import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/_protected')({
    component: RouteComponent,
    beforeLoad: ({ context }) => {
        if (typeof window === 'undefined') {
            return;
        }
        if (context.auth.isLoading) {
            return;
        }
        const user = context.auth.user;
        if (!user) {
            throw redirect({ to: '/' });
        }
        const isCustomer = user.roles.some((role) => role.name.toLowerCase() === 'customer');
        if (!isCustomer) {
            throw redirect({ to: '/admin' });
        }
    }
});

function RouteComponent() {
    return <Outlet />;
}
