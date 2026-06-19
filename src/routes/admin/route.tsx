import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate, Navigate } from '@tanstack/react-router';
import AppSidebar from '#/components/layout/Sidebar';
import { SidebarProvider, SidebarInset } from '#/components/ui/sidebar';
import AdminHeader from '#/components/layout/admin-header';
import { useAuth } from '#/context/AuthContext';
import LoadingPage from '#/components/layout/loading-page';

export const Route = createFileRoute('/admin')({
    beforeLoad: ({ context }) => {
        if (context.auth.isLoading) {
            return;
        }
        const user = context.auth.user;
        if (!user) {
            throw redirect({ to: '/login' });
        }
        const isCustomer = user.roles.some((role) => role.name.toLowerCase() === 'customer');
        if (isCustomer) {
            throw redirect({ to: '/' });
        }
    },
    component: AdminLayout
});

function AdminLayout() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: '/login' as any });
        } else if (!isLoading && user) {
            const isCustomer = user.roles.some((role) => role.name.toLowerCase() === 'customer');
            if (isCustomer) {
                navigate({ to: '/' as any });
            }
        }
    }, [isLoading, isAuthenticated, user, navigate]);

    if (isLoading) {
        return <LoadingPage />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    const isCustomer = user?.roles.some((role) => role.name.toLowerCase() === 'customer');
    if (isCustomer) {
        return <Navigate to="/" />;
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0 overflow-x-hidden">
                <main className="flex relative flex-col h-svh min-w-0 w-full overflow-y-auto overflow-x-hidden">
                    <AdminHeader />
                    <section className="grow flex flex-col px-3 py-4 md:px-4 md:py-6 container mx-auto min-w-0">
                        <Outlet />
                    </section>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
