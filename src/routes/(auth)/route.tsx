import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate, Navigate } from '@tanstack/react-router';
import { useAuth } from '#/context/AuthContext';
import LoadingPage from '#/components/layout/loading-page';

export const Route = createFileRoute('/(auth)')({
    component: RouteComponent,
    beforeLoad: ({ context }) => {
        if (context.auth.isLoading) {
            return;
        }
        const user = context.auth.user;
        if (user) {
            const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
            throw redirect({ to: isCustomer ? '/' : '/admin' });
        }
    }
});

function RouteComponent() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
            navigate({ to: isCustomer ? '/' : ('/admin' as any) });
        }
    }, [isLoading, isAuthenticated, user, navigate]);

    if (isLoading) {
        return <LoadingPage />;
    }

    if (isAuthenticated && user) {
        const isCustomer = user.roles.find((role: any) => role.name.toLowerCase() === 'customer');
        return <Navigate to={isCustomer ? '/' : '/admin'} />;
    }

    return <Outlet />;
}
