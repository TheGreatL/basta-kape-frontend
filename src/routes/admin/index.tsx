import { useEffect } from 'react';
import DashboardPage from '#/feature/dashboard/dashboard-page';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { appModules, appPermissions } from '#/constants/rbac';
import { getUserPermissions, hasPermission, getDefaultAdminRoute } from '#/utils/rbac';
import { useAuth } from '#/context/AuthContext';

export const Route = createFileRoute('/admin/')({
    beforeLoad: ({ context }) => {
        if (context.auth.isLoading) {
            return;
        }
        const user = context.auth.user;
        if (!user) {
            throw redirect({ to: '/login' });
        }
        const permissions = getUserPermissions(user);
        if (!hasPermission(permissions, appModules.DASHBOARD, appPermissions.READ)) {
            const defaultRoute = getDefaultAdminRoute(permissions);
            if (defaultRoute !== '/admin') {
                throw redirect({ to: defaultRoute as any });
            }
        }
    },
    component: DashboardGuard
});

function DashboardGuard() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && user) {
            const permissions = getUserPermissions(user);
            if (!hasPermission(permissions, appModules.DASHBOARD, appPermissions.READ)) {
                const defaultRoute = getDefaultAdminRoute(permissions);
                if (defaultRoute !== '/admin') {
                    navigate({ to: defaultRoute as any, replace: true });
                }
            }
        }
    }, [user, isLoading, navigate]);

    const permissions = getUserPermissions(user);
    if (!hasPermission(permissions, appModules.DASHBOARD, appPermissions.READ)) {
        return null;
    }

    return <DashboardPage />;
}
