import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)')({
    component: RouteComponent,
    beforeLoad: ({ context }) => {
        const user = context.auth().user;
        if (user) {
            const isCustomer = user.roles.find((role) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    }
});

function RouteComponent() {
    return <Outlet />;
}
