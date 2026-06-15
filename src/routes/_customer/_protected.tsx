import { useAuthStore } from '#/store/auth-store.ts';
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/_protected')({
    component: RouteComponent,
    beforeLoad: () => {}
});

function RouteComponent() {
    const auth = useAuthStore();
    if (auth.user) {
        if (auth.user.roles.find((role) => role.name.toLowerCase() === 'customer')) {
            return <Outlet />;
        }
        return <Navigate to="/admin" />;
    }
    return <Navigate to="/" />;
}
