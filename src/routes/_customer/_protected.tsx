import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate, Navigate } from '@tanstack/react-router';
import { useAuth } from '#/context/AuthContext';
import LoadingPage from '#/components/layout/loading-page';

export const Route = createFileRoute('/_customer/_protected')({
    component: RouteComponent,
    beforeLoad: ({ context }) => {
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
    const { isLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/' as any });
        } else if (!isLoading && user) {
            const isCustomer = user.roles.some((role) => role.name.toLowerCase() === 'customer');
            if (!isCustomer) {
                navigate({ to: '/admin' as any });
            }
        }
    }, [isLoading, isAuthenticated, user, navigate]);

    if (isLoading) {
        return <LoadingPage />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" />;
    }

    const isCustomer = user?.roles.some((role) => role.name.toLowerCase() === 'customer');
    if (!isCustomer) {
        return <Navigate to="/admin" />;
    }

    return <Outlet />;
}
