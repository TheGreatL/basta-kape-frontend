import { useAuth } from '#/context/AuthContext';
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_customer/_protected')({
    component: RouteComponent
});

function RouteComponent() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (user) {
        const isCustomer = user.roles.some((role) => role.name.toLowerCase() === 'customer');
        if (isCustomer) {
            return <Outlet />;
        }
        return <Navigate to="/admin" />;
    }
    return <Navigate to="/login" />;
}
